import { type SQL, type SQLWrapper, and, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { type SQLiteColumn, union } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";
import * as schema from "./database";
import type { Event, SubscriptionFilter } from "./types/core";

type JoinedRow = {
  event: typeof schema.events.$inferInsert;
  tag: typeof schema.tags.$inferInsert | null;
};

const aggregateEvent = (rows: JoinedRow[]): Event[] => {
  const aggregated = rows.reduce((acc: Record<string, Event>, { event, tag }) => {
    const existingEvent = acc[event.id];
    if (!existingEvent) {
      acc[event.id] = {
        id: event.id,
        pubkey: event.author,
        created_at: event.created_at.getTime() / 1000,
        kind: event.kind,
        tags: [],
        content: event.content,
        sig: event.sig,
      };
    }

    const currentEvent = acc[event.id];
    if (currentEvent && tag) {
      currentEvent.tags.push(tag.recomendedRelay ? [tag.name, tag.value, tag.recomendedRelay] : [tag.name, tag.value]);
    }

    return acc;
  }, {});

  return Object.values(aggregated);
};

const helper = (column: SQLiteColumn, values: string[]) =>
  or(...values.map((value) => (value.length === 64 ? eq(column, value) : like(column, `${value}%`))));

const buildQuery = (filter: SubscriptionFilter): SQL | undefined => {
  const queries: (SQLWrapper | undefined)[] = [];

  if (filter.ids)
    if (filter.ids.length > 0) queries.push(helper(schema.events.id, filter.ids));
    else queries.push(sql`1 = 0`);
  if (filter.authors)
    if (filter.authors.length > 0) queries.push(helper(schema.events.author, filter.authors));
    else queries.push(sql`1 = 0`);
  if (filter.kinds) queries.push(inArray(schema.events.kind, filter.kinds));
  if (filter.since) queries.push(gte(schema.events.created_at, new Date(filter.since * 1000)));
  if (filter.until) queries.push(lte(schema.events.created_at, new Date(filter.until * 1000)));

  const tagQueries = Object.entries(filter)
    .filter(([key]) => key.startsWith("#"))
    .map(([tag, values]) => and(eq(schema.tags.name, tag.slice(1)), inArray(schema.tags.value, values as string[])));
  if (tagQueries.length > 0) queries.push(or(...tagQueries));

  return and(...queries);
};

export const createRepository = (db: BetterSQLite3Database<typeof schema>) => ({
  saveEvent: async (event: Event): Promise<void> => {
    console.log(new Date(event.created_at * 1000));
    const insertableEvent = {
      id: event.id,
      kind: event.kind,
      author: event.pubkey,
      sig: event.sig,
      hidden: false,
      content: event.content,
      first_seen: new Date(),
      created_at: new Date(event.created_at * 1000),
    };
    const insertableTags = event.tags.map((tag) => ({
      id: uuidv7(),
      eventId: event.id,
      name: tag[0],
      value: tag[1],
      recomendedRelay: tag[2] ?? null,
    }));

    await db.transaction(async (tx) => {
      await tx.insert(schema.events).values(insertableEvent);
      await tx.insert(schema.tags).values(insertableTags);
    });
  },
  queryEventById: async (id: string): Promise<Event | null> => {
    const events = await db
      .select({ event: schema.events, tag: schema.tags })
      .from(schema.events)
      .leftJoin(schema.tags, eq(schema.events.id, schema.tags.eventId))
      .where(eq(schema.events.id, id))
      .limit(1);

    if (events.length === 0) return null;
    return aggregateEvent(events)[0];
  },
  queryEventsByFilters: async (filters: SubscriptionFilter[]): Promise<Event[]> => {
    if (filters.length === 0) return [];
    const queries = filters.map((filter) =>
      db
        .select({ event: schema.events, tag: schema.tags })
        .from(schema.events)
        .leftJoin(schema.tags, eq(schema.events.id, schema.tags.eventId))
        .where(buildQuery(filter)),
    );

    const events =
      queries.length === 1
        ? await queries[0].limit(Math.max(2000, filters[0].limit ?? 100)).orderBy(desc(schema.events.created_at))
        : await union(queries[0], queries[1], ...queries.slice(2))
            .limit(Math.max(2000, ...filters.map((filter) => filter.limit ?? 100)))
            .orderBy(desc(schema.events.created_at));

    return aggregateEvent(events);
  },
});
