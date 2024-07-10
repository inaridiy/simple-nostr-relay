import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7";
import { db } from "./db";
import { parseClientToRelayPayload } from "./schemas/core";

const app = new Hono();
const port = 3000;

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use(async (c, next) => {
  c.set("db", db);
  await next();
});

app.get(
  "/",
  upgradeWebSocket(() => {
    const connectionId = uuidv7();

    return {
      onMessage(evt, ws) {
        const payload = parseClientToRelayPayload(evt.data);
      },
    };
  })
);

const server = serve({ fetch: app.fetch, port });
injectWebSocket(server);
