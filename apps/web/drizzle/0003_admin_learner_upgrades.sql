CREATE TABLE `badges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`earned_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `badges_user_code_uq` ON `badges` (`user_id`,`code`);--> statement-breakpoint
CREATE INDEX `badges_user_idx` ON `badges` (`user_id`);--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`max_uses` integer DEFAULT 1 NOT NULL,
	`uses` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `papers` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subject` text NOT NULL,
	`grade` integer NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`license` text,
	`license_url` text,
	`source_url` text,
	`retrieved_at` text,
	`adaptation_note` text,
	`questions` text DEFAULT '[]' NOT NULL,
	`unit_ids` text DEFAULT '[]' NOT NULL,
	`time_limit_min` integer,
	`points_per_question` integer DEFAULT 10 NOT NULL,
	`created_at` integer NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`review_note` text
);
--> statement-breakpoint
CREATE INDEX `papers_status_idx` ON `papers` (`status`,`visibility`);--> statement-breakpoint
CREATE INDEX `papers_owner_idx` ON `papers` (`owner_id`);--> statement-breakpoint
CREATE TABLE `srs_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`tag` text NOT NULL,
	`fingerprint` text NOT NULL,
	`question` text NOT NULL,
	`due_at` integer NOT NULL,
	`interval_days` integer DEFAULT 1 NOT NULL,
	`ease` integer DEFAULT 250 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`last_review_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `srs_user_fp_uq` ON `srs_cards` (`user_id`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `srs_due_idx` ON `srs_cards` (`user_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `totp_secrets` (
	`user_id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`enabled_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `assignments` ADD `mode` text DEFAULT 'random' NOT NULL;--> statement-breakpoint
ALTER TABLE `assignments` ADD `paper_id` text;--> statement-breakpoint
ALTER TABLE `assignments` ADD `time_limit_min` integer;--> statement-breakpoint
ALTER TABLE `assignments` ADD `points_per_question` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `content_packs` ADD `license_url` text;--> statement-breakpoint
ALTER TABLE `content_packs` ADD `retrieved_at` text;--> statement-breakpoint
ALTER TABLE `content_packs` ADD `adaptation_note` text;--> statement-breakpoint
ALTER TABLE `content_packs` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `content_packs` ADD `reviewed_at` integer;--> statement-breakpoint
ALTER TABLE `content_packs` ADD `reviewed_by` text;--> statement-breakpoint
ALTER TABLE `content_packs` ADD `review_sample` text;