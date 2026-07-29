import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure";
import WebSocket from "ws";
import type { Event } from "../src/types/core";

type Mode = "sequential" | "rayon";

interface RunResult {
  elapsedMs: number;
  eventsPerSecond: number;
  p50Ms: number;
  p95Ms: number;
}

const positiveInteger = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
};

const eventCount = positiveInteger("BENCH_EVENTS", 1000);
const runCount = positiveInteger("BENCH_RUNS", 3);
const rayonThreads = positiveInteger("BENCH_THREADS", 8);
const connectionCounts = (process.env.BENCH_CONNECTIONS ?? "1,4,16,64").split(",").map((raw) => {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`invalid BENCH_CONNECTIONS value: ${raw}`);
  return value;
});

const delay = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

const valueAt = <T>(values: readonly T[], index: number): T => {
  const value = values[index];
  if (value === undefined) throw new Error(`missing benchmark value at index ${index}`);
  return value;
};

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (valueAt(sorted, middle - 1) + valueAt(sorted, middle)) / 2 : valueAt(sorted, middle);
};

const percentile = (values: readonly number[], fraction: number): number => {
  const sorted = [...values].sort((left, right) => left - right);
  return valueAt(sorted, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction)));
};

const getFreePort = async (): Promise<number> => {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("failed to allocate a benchmark port");
  await new Promise<void>((resolve, reject) => server.close((error) => (error === undefined ? resolve() : reject(error))));
  return address.port;
};

const prepareDatabase = async (databasePath: string): Promise<void> => {
  const sqlite = new Database(databasePath);
  try {
    await migrate(drizzle(sqlite), { migrationsFolder: "./drizzle" });
  } finally {
    sqlite.close();
  }
};

const startRelay = async (mode: Mode, databasePath: string): Promise<{ child: ChildProcess; port: number; logs: () => string }> => {
  const port = await getFreePort();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
    DATABASE_PATH: databasePath,
    MAX_MESSAGES_PER_MINUTE: String(eventCount + 1000),
    RAYON_NUM_THREADS: mode === "rayon" ? String(rayonThreads) : "0",
    RAYON_SEQUENTIAL: undefined,
  };

  const child = spawn(process.execPath, ["dist/index.js"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout?.on("data", (chunk) => {
    output += String(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    output += String(chunk);
  });

  const deadline = performance.now() + 10_000;
  while (performance.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`relay exited during startup (${mode}):\n${output}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        headers: { Accept: "application/nostr+json" },
      });
      if (response.ok) return { child, port, logs: () => output };
    } catch {
      // The process is still warming the worker pool or binding its socket.
    }
    await delay(25);
  }
  child.kill("SIGKILL");
  throw new Error(`relay startup timed out (${mode}):\n${output}`);
};

const stopRelay = async (child: ChildProcess): Promise<void> => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await Promise.race([exited, delay(2_000)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
};

const openSocket = async (url: string): Promise<WebSocket> => {
  const socket = new WebSocket(url, { perMessageDeflate: false });
  await new Promise<void>((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  return socket;
};

const request = (socket: WebSocket, event: Event): Promise<unknown[]> =>
  new Promise((resolve, reject) => {
    const onMessage = (raw: WebSocket.RawData) => {
      socket.off("error", onError);
      resolve(JSON.parse(String(raw)) as unknown[]);
    };
    const onError = (error: Error) => {
      socket.off("message", onMessage);
      reject(error);
    };
    socket.once("message", onMessage);
    socket.once("error", onError);
    socket.send(JSON.stringify(["EVENT", event]));
  });

const publishEvents = async (port: number, events: readonly Event[], connections: number): Promise<RunResult> => {
  const sockets = await Promise.all(Array.from({ length: connections }, () => openSocket(`ws://127.0.0.1:${port}`)));
  const latencies: number[] = [];
  let nextIndex = 0;
  const startedAt = performance.now();

  try {
    await Promise.all(
      sockets.map(async (socket) => {
        while (nextIndex < events.length) {
          const index = nextIndex++;
          const event = events[index];
          if (event === undefined) throw new Error(`missing benchmark event ${index}`);
          const requestStartedAt = performance.now();
          const response = await request(socket, event);
          latencies.push(performance.now() - requestStartedAt);
          if (response[0] !== "OK" || response[1] !== event.id || response[2] !== true) {
            throw new Error(`relay rejected benchmark event ${index}: ${JSON.stringify(response)}`);
          }
        }
      }),
    );
  } finally {
    for (const socket of sockets) socket.close();
  }

  const elapsedMs = performance.now() - startedAt;
  return {
    elapsedMs,
    eventsPerSecond: events.length / (elapsedMs / 1000),
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
  };
};

const runOnce = async (root: string, mode: Mode, run: number, connections: number, events: readonly Event[]): Promise<RunResult> => {
  const databasePath = join(root, `${connections}-${run}-${mode}.sqlite`);
  await prepareDatabase(databasePath);
  const relay = await startRelay(mode, databasePath);
  try {
    return await publishEvents(relay.port, events, connections);
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${relay.logs()}`);
  } finally {
    await stopRelay(relay.child);
  }
};

const secretKey = generateSecretKey();
const createdAt = Math.floor(Date.now() / 1000);
const events = Array.from(
  { length: eventCount },
  (_, index) =>
    finalizeEvent(
      {
        kind: 1,
        created_at: createdAt,
        tags: [],
        content: `rayon benchmark ${index}`,
      },
      secretKey,
    ) as unknown as Event,
);

const temporaryRoot = await mkdtemp(join(tmpdir(), "simple-nostr-relay-bench-"));
const allResults = new Map<number, Record<Mode, RunResult[]>>();

try {
  for (const connections of connectionCounts) {
    const results: Record<Mode, RunResult[]> = { sequential: [], rayon: [] };
    allResults.set(connections, results);
    for (let run = 0; run < runCount; run++) {
      const modes: Mode[] = run % 2 === 0 ? ["sequential", "rayon"] : ["rayon", "sequential"];
      for (const mode of modes) {
        const result = await runOnce(temporaryRoot, mode, run, connections, events);
        results[mode].push(result);
        console.log(`${connections} connections, ${mode}, run ${run + 1}: ${result.eventsPerSecond.toFixed(1)} events/s`);
      }
    }
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

console.log("");
console.log(
  `Median of ${runCount} runs; ${eventCount} pre-signed events per run; ${rayonThreads} rayon workers; fresh SQLite database per run.`,
);
console.log("| Connections | Sequential events/s | Rayon events/s | Speedup | Sequential p50/p95 | Rayon p50/p95 |");
console.log("| ---: | ---: | ---: | ---: | ---: | ---: |");
for (const connections of connectionCounts) {
  const results = allResults.get(connections);
  if (results === undefined) throw new Error(`missing benchmark results for ${connections} connections`);
  const sequentialThroughput = median(results.sequential.map((result) => result.eventsPerSecond));
  const rayonThroughput = median(results.rayon.map((result) => result.eventsPerSecond));
  const sequentialP50 = median(results.sequential.map((result) => result.p50Ms));
  const sequentialP95 = median(results.sequential.map((result) => result.p95Ms));
  const rayonP50 = median(results.rayon.map((result) => result.p50Ms));
  const rayonP95 = median(results.rayon.map((result) => result.p95Ms));
  console.log(
    `| ${connections} | ${sequentialThroughput.toFixed(1)} | ${rayonThroughput.toFixed(1)} | ${(
      rayonThroughput / sequentialThroughput
    ).toFixed(3)}x | ${sequentialP50.toFixed(3)} / ${sequentialP95.toFixed(3)} ms | ${rayonP50.toFixed(3)} / ${rayonP95.toFixed(3)} ms |`,
  );
}
