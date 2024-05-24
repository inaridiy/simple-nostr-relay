CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` integer,
	`author` text,
	`hidden` integer,
	`content` text,
	`first_seen` integer,
	`created_at` integer,
	`expires_at` integer
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text,
	`name` text,
	`value` text
);
--> statement-breakpoint
CREATE INDEX `kind_idx` ON `events` (`kind`);--> statement-breakpoint
CREATE INDEX `author_idx` ON `events` (`author`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `events` (`created_at`);--> statement-breakpoint
CREATE INDEX `kind_composite_idx` ON `events` (`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `kind_author_idx` ON `events` (`kind`,`author`);--> statement-breakpoint
CREATE INDEX `author_created_at_idx` ON `events` (`author`,`created_at`);--> statement-breakpoint
CREATE INDEX `author_kind_idx` ON `events` (`author`,`kind`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `events` (`expires_at`);--> statement-breakpoint
CREATE INDEX `event_id_idx` ON `tags` (`event_id`);--> statement-breakpoint
CREATE INDEX `tag_value_idx` ON `tags` (`value`);--> statement-breakpoint
CREATE INDEX `tag_composite_idx` ON `tags` (`event_id`,`name`,`value`);--> statement-breakpoint
CREATE INDEX `tag_name_event_id_idx` ON `tags` (`name`,`event_id`,`value`);