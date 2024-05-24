import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { db } from "./db";

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
