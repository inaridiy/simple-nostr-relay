import { serve } from "@hono/node-server";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { Hono } from "hono";
import * as schema from "./database";

declare module "hono" {
	interface ContextVariableMap {
		db: ReturnType<typeof drizzle>;
	}
}

const sqlite = new Database("database.sqlite");
const db = drizzle(sqlite, { schema });

const app = new Hono();
const port = 3000;

app.use(async (c, next) => {
	c.set("db", db);
	await next();
});

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

serve({ fetch: app.fetch, port });
