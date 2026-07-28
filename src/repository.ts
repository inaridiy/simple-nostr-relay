import { type SQL, type SQLWrapper, and, count, desc, eq, gte, inArray, like, lte, ne, or, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";
import * as schema from "./database";
import { getTagValuesByName } from "./nostr/utils";
import type { Event, SubscriptionFilter } from "./types/core";
import type { DeletionEvent } from "./types/nip9";

const DEFAULT_MAX_QUERY_LIMIT = 2000;

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
    raw: event,
  };
  // Single-element tags like ["client"] are valid (NIP-01) but have no value to index; they stay in `raw`.
  const insertableTags = event.tags
    .filter((tag) => tag.length >= 2)
    .map((tag) => ({
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

const hasTagQueryHelper = (tagName: string, values: string[]) => {
  return sql`${schema.events.id} IN (
    SELECT DISTINCT ${schema.tags.eventId}
    FROM ${schema.tags}
    WHERE ${schema.tags.name} = ${tagName} AND ${schema.tags.value} IN (${sql.join(
      values.map((value) => sql`${value}`),
      sql`, `,
    )})
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

  // Each tag condition must hold (AND across conditions, OR within one condition's values).
  const tagFilters = Object.entries(filter).filter(([key]) => key.startsWith("#") && key.length === 2);
  for (const [tag, values] of tagFilters) {
    if ((values as string[]).length > 0) queries.push(hasTagQueryHelper(tag.slice(1), values as string[]));
    else queries.push(sql`1 = 0`);
  }

  return and(...queries);
};

// NIP-01: keep the latest version; on equal timestamps the lexicographically smallest id wins.
const isNewestAmong = (event: Event, existing: { id: string; created_at: Date }[]): boolean =>
  existing.every((row) => {
    const rowCreatedAt = Math.floor(row.created_at.getTime() / 1000);
    return event.created_at > rowCreatedAt || (event.created_at === rowCreatedAt && event.id < row.id);
  });

export type RepositoryOptions = {
  enableNIP26?: boolean;
  maxQueryLimit?: number;
};

export const createRepository = (db: BetterSQLite3Database<typeof schema>, options: RepositoryOptions = {}) => ({
  saveEvent: async (event: Event): Promise<void> => {
    const { insertableEvent, insertableTags } = toInsertableEvent(event);

    db.transaction((tx) => {
      tx.insert(schema.events).values(insertableEvent).run();
      insertableTags.length > 0 && tx.insert(schema.tags).values(insertableTags).run();
    });
  },
  saveReplaceableEvent: async (event: Event): Promise<void> => {
    const { insertableEvent, insertableTags } = toInsertableEvent(event);
    const sameKindQuery = and(eq(schema.events.author, event.pubkey), eq(schema.events.kind, event.kind));

    db.transaction((tx) => {
      const existing = tx
        .select({ id: schema.events.id, created_at: schema.events.created_at })
        .from(schema.events)
        .where(and(sameKindQuery, eq(schema.events.replaced, false)))
        .all();
      if (!isNewestAmong(event, existing)) return;

      tx.update(schema.events).set({ replaced: true }).where(sameKindQuery).run();
      tx.insert(schema.events).values(insertableEvent).run();
      insertableTags.length > 0 && tx.insert(schema.tags).values(insertableTags).run();
    });
  },
  saveTemporaryEvent: async (_event: Event): Promise<void> => {
    /* Do nothing */
  },
  saveParameterizedReplaceableEvent: async (event: Event): Promise<void> => {
    const { insertableEvent, insertableTags } = toInsertableEvent(event);

    const d = getTagValuesByName(event, "d");
    if (d.length !== 1) throw new Error("invalid: Parameterized replaceable event should have one d tag");
    const [dIdentifier] = d;
    const sameAddressQuery = and(
      eq(schema.events.author, event.pubkey),
      eq(schema.events.kind, event.kind),
      hasDIdentifierQueryHelper(dIdentifier),
    );

    db.transaction((tx) => {
      const existing = tx
        .select({ id: schema.events.id, created_at: schema.events.created_at })
        .from(schema.events)
        .where(and(sameAddressQuery, eq(schema.events.replaced, false)))
        .all();
      if (!isNewestAmong(event, existing)) return;

      tx.update(schema.events).set({ replaced: true }).where(sameAddressQuery).run();
      tx.insert(schema.events).values(insertableEvent).run();
      insertableTags.length > 0 && tx.insert(schema.tags).values(insertableTags).run();
    });
  },
  deleteEventsByDeletionEvent: async (event: DeletionEvent): Promise<void> => {
    // NIP-09: targets are referenced by e/a tags; k tags are informational only.
    const e = getTagValuesByName(event, "e");
    const a = getTagValuesByName(event, "a");
    if (e.length === 0 && a.length === 0) throw new Error("invalid: deletion event must have at least one e or a tag");

    const authorQuery = options.enableNIP26
      ? or(eq(schema.events.author, event.pubkey), eq(schema.events.detegator, event.pubkey))
      : eq(schema.events.author, event.pubkey);

    const queries = [];
    if (e.length > 0) {
      queries.push(and(inArray(schema.events.id, e), authorQuery));
    }
    for (const aValue of a) {
      const [kind, , dIdentifier] = aValue.split(":");
      queries.push(
        and(
          eq(schema.events.kind, Number(kind)),
          authorQuery,
          // Only versions published up to the deletion request are deleted.
          lte(schema.events.created_at, new Date(event.created_at * 1000)),
          dIdentifier ? hasDIdentifierQueryHelper(dIdentifier) : undefined,
        ),
      );
    }

    await db
      .update(schema.events)
      .set({ hidden: true })
      .where(and(or(...queries), eq(schema.events.hidden, false), ne(schema.events.kind, 5)));
  },
  countEventsByFilters: async (filters: SubscriptionFilter[]): Promise<number> => {
    if (filters.length === 0) return 0;
    const result = await db
      .select({ count: count() })
      .from(schema.events)
      .where(or(...filters.map((filter) => buildQuery(filter, options))));
    return result[0]?.count ?? 0;
  },
  queryEventById: async (id: string): Promise<Event | null> => {
    const events = await db
      .select({ raw: schema.events.raw })
      .from(schema.events)
      .where(and(eq(schema.events.id, id), eq(schema.events.hidden, false)));

    if (events.length === 0) return null;
    return events[0].raw as Event;
  },
  queryEventsByFilters: async (filters: SubscriptionFilter[]): Promise<Event[]> => {
    if (filters.length === 0) return [];
    const limit = Math.min(options.maxQueryLimit ?? DEFAULT_MAX_QUERY_LIMIT, Math.max(...filters.map((filter) => filter.limit ?? 100)));

    const results = await db
      .select({ raw: schema.events.raw })
      .from(schema.events)
      .where(or(...filters.map((filter) => buildQuery(filter, options))))
      .orderBy(desc(schema.events.created_at))
      .limit(limit);

    return results.map((result) => result.raw as Event);
  },
});
