import { Hono } from "hono/mod.ts";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

Deno.serve(app.fetch);
