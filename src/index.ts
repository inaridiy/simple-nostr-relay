import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { db } from "./db";

const app = new Hono();
const port = 3000;

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use(async (c, next) => {
  c.set("db", db);
  await next();
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

const server = serve({ fetch: app.fetch, port });
injectWebSocket(server);
