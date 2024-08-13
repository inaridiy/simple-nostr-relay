import { type SQL, type SQLWrapper, and, count, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { type SQLiteColumn, union } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";
import * as schema from "./database";
import { getTagValuesByName } from "./nostr/utils";
import type { Event, SubscriptionFilter } from "./types/core";
import type { DeletionEvent } from "./types/nip9";

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
      currentEvent.tags.push([tag.name, tag.value, ...(tag.rest ?? [])]);
    }

    return acc;
  }, {});

  return Object.values(aggregated);
};

const toInsertableEvent = (event: Event) => {
  const insertableEvent = {
    id: event.id,
    kind: event.kind,
    author: event.pubkey,
    detegator: getTagValuesByName(event, "delegation")[0] ?? null,
    sig: event.sig,
    hidden: false,
    replaced: false,
    content: event.content,
    first_seen: new Date(),
    created_at: new Date(event.created_at * 1000),
  };
  const insertableTags = event.tags.map((tag) => ({
    id: uuidv7(),
    eventId: event.id,
    name: tag[0],
    value: tag[1],
    rest: tag.slice(2),
  }));

  return { insertableEvent, insertableTags };
};

const hexQueryHelper = (column: SQLiteColumn, values: string[]) =>
  or(...values.map((value) => (value.length === 64 ? eq(column, value) : like(column, `${value}%`))));

const hasDIdentifierQueryHelper = (dIdentifier: string) => {
  return sql`${schema.events.id} IN (
    SELECT DISTINCT ${schema.tags.eventId}
    FROM ${schema.tags}
    WHERE ${schema.tags.name} = 'd' AND ${schema.tags.value} = ${dIdentifier}
  )`;
};

const buildQuery = (filter: SubscriptionFilter, opt: RepositoryOptions): SQL | undefined => {
  const queries: (SQLWrapper | undefined)[] = [];
  queries.push(eq(schema.events.hidden, false));
  queries.push(eq(schema.events.replaced, false));

  if (filter.ids)
    if (filter.ids.length > 0) queries.push(hexQueryHelper(schema.events.id, filter.ids));
    else queries.push(sql`1 = 0`);
  if (filter.authors)
    if (filter.authors.length === 0) queries.push(sql`1 = 0`);
    else if (opt.enableNIP26)
      queries.push(or(hexQueryHelper(schema.events.detegator, filter.authors), hexQueryHelper(schema.events.author, filter.authors)));
    else queries.push(hexQueryHelper(schema.events.author, filter.authors));
  if (filter.kinds) queries.push(inArray(schema.events.kind, filter.kinds));
  if (filter.since) queries.push(gte(schema.events.created_at, new Date(filter.since * 1000)));
  if (filter.until) queries.push(lte(schema.events.created_at, new Date(filter.until * 1000)));

  const tagQueries = Object.entries(filter)
    .filter(([key]) => key.startsWith("#") && key.length === 2)
    .map(([tag, values]) => and(eq(schema.tags.name, tag.slice(1)), inArray(schema.tags.value, values as string[])));
  if (tagQueries.length > 0) queries.push(or(...tagQueries));

  return and(...queries);
};

export type RepositoryOptions = {
  enableNIP26?: boolean;
};

export const createRepository = (db: BetterSQLite3Database<typeof schema>, options: RepositoryOptions = {}) => ({
  saveEvent: async (event: Event): Promise<void> => {
    const { insertableEvent, insertableTags } = toInsertableEvent(event);

    await db.transaction(async (tx) => {
      await tx.insert(schema.events).values(insertableEvent);
      insertableTags.length > 0 && (await tx.insert(schema.tags).values(insertableTags));
    });
  },
  saveReplaceableEvent: async (event: Event): Promise<void> => {
    const { insertableEvent, insertableTags } = toInsertableEvent(event);

    await db.transaction(async (tx) => {
      await tx
        .update(schema.events)
        .set({ replaced: true })
        .where(and(eq(schema.events.author, event.pubkey), eq(schema.events.kind, event.kind)));
      await tx.insert(schema.events).values(insertableEvent);
      insertableTags.length > 0 && (await tx.insert(schema.tags).values(insertableTags));
    });
  },
  saveTemporaryEvent: async (_event: Event): Promise<void> => {
    /* Do nothing */
  },
  saveParameterizedReplaceableEvent: async (event: Event): Promise<void> => {
    const { insertableEvent, insertableTags } = toInsertableEvent(event);

    const d = getTagValuesByName(event, "d");
    if (d.length !== 1) throw new Error("invalid: Parameterized replaceable event should not have d tag");
    const [dIdentifier] = d;

    await db.transaction(async (tx) => {
      await tx
        .update(schema.events)
        .set({ replaced: true })
        .where(and(eq(schema.events.author, event.pubkey), eq(schema.events.kind, event.kind), hasDIdentifierQueryHelper(dIdentifier)));
      await tx.insert(schema.events).values(insertableEvent);
      insertableTags.length > 0 && (await tx.insert(schema.tags).values(insertableTags));
    });
  },
  deleteEventsByDeletionEvent: async (event: DeletionEvent): Promise<void> => {
    const e = getTagValuesByName(event, "e");
    const a = getTagValuesByName(event, "a");
    const k = getTagValuesByName(event, "k");
    if (a.length === 0 && e.length === 0 && k.length === 0) return;

    const authorQuery = options.enableNIP26
      ? or(eq(schema.events.author, event.pubkey), eq(schema.events.detegator, event.pubkey))
      : eq(schema.events.author, event.pubkey);

    const queries = [];
    if (e.length > 0) {
      queries.push(and(inArray(schema.events.id, e), eq(schema.events.hidden, false), authorQuery));
    }
    if (a.length > 0) {
      for (const aValue of a) {
        const [kind, , dIdentifier] = aValue.split(":");
        queries.push(
          and(
            eq(schema.events.kind, Number(kind)),
            authorQuery,
            eq(schema.events.hidden, false),
            dIdentifier ? hasDIdentifierQueryHelper(dIdentifier) : undefined,
          ),
        );
      }
    }
    if (k.length > 0) {
      queries.push(and(inArray(schema.events.kind, k.map(Number)), eq(schema.events.hidden, false), authorQuery));
    }

    await db
      .update(schema.events)
      .set({ hidden: true })
      .where(or(...queries));
  },
  countEventsByFilters: async (filters: SubscriptionFilter[]): Promise<number> => {
    if (filters.length === 0) return 0;
    const result = await db
      .select({ count: count(schema.events.id) })
      .from(schema.events)
      .leftJoin(schema.tags, eq(schema.events.id, schema.tags.eventId))
      .where(or(...filters.map((filter) => buildQuery(filter, options))));
    return result[0]?.count ?? 0;
  },
  queryEventById: async (id: string): Promise<Event | null> => {
    const events = await db
      .selectDistinct({ event: schema.events, tag: schema.tags })
      .from(schema.events)
      .leftJoin(schema.tags, eq(schema.events.id, schema.tags.eventId))
      .where(and(eq(schema.events.id, id), eq(schema.events.hidden, false)));

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
        .where(buildQuery(filter, options)),
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
