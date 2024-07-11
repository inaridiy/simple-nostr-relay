import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    kind: integer("kind").notNull(),
    author: text("author").notNull(),
    sig: text("sig").notNull(),
    hidden: integer("hidden", { mode: "boolean" }).notNull(),
    content: text("content").notNull(),
    first_seen: integer("first_seen", { mode: "timestamp" }).notNull(),
    created_at: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    kindIdx: index("kind_idx").on(table.kind),
    authorIdx: index("author_idx").on(table.author),
    createdAtIdx: index("created_at_idx").on(table.created_at),
    eventCompositeIdx: index("kind_composite_idx").on(table.kind, table.created_at),
    kindAuthorIdx: index("kind_author_idx").on(table.kind, table.author),
    authorCreatedAtIdx: index("author_created_at_idx").on(table.author, table.created_at),
    authorKindIdx: index("author_kind_idx").on(table.author, table.kind),
  }),
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull(),
    name: text("name").notNull(),
    value: text("value").notNull(),
    recomendedRelay: text("recomended_relay"),
  },
  (table) => ({
    eventIdIdx: index("event_id_idx").on(table.eventId),
    tagValueIdx: index("tag_value_idx").on(table.value),
    tagCompositeIdx: index("tag_composite_idx").on(table.eventId, table.name, table.value),
    tagNameEventIdIdx: index("tag_name_event_id_idx").on(table.name, table.eventId, table.value),
  }),
);

export const eventsRelations = relations(events, ({ many }) => ({ tags: many(tags) }));
export const tagsRelations = relations(tags, ({ one }) => ({
  event: one(events, { fields: [tags.eventId], references: [events.id] }),
}));
