DROP INDEX `kind_idx`;--> statement-breakpoint
DROP INDEX `author_idx`;--> statement-breakpoint
DROP INDEX `kind_author_idx`;--> statement-breakpoint
DROP INDEX `event_id_idx`;--> statement-breakpoint
DROP INDEX `tag_value_idx`;--> statement-breakpoint
DROP INDEX `tag_name_event_id_idx`;--> statement-breakpoint
CREATE INDEX `tag_name_value_event_id_idx` ON `tags` (`name`,`value`,`event_id`);