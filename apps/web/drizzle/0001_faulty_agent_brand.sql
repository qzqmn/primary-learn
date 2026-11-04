CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`title` text NOT NULL,
	`unit_id` text NOT NULL,
	`count` integer NOT NULL,
	`due_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attempt_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` text NOT NULL,
	`user_id` text NOT NULL,
	`idx` integer NOT NULL,
	`unit_id` text NOT NULL,
	`tag` text NOT NULL,
	`correct` integer NOT NULL,
	`given` text NOT NULL,
	`time_ms` integer DEFAULT 0 NOT NULL,
	`ts` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aa_attempt_idx_uq` ON `attempt_answers` (`attempt_id`,`idx`);--> statement-breakpoint
CREATE INDEX `aa_user_tag_idx` ON `attempt_answers` (`user_id`,`tag`);--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`unit_id` text NOT NULL,
	`assignment_id` text,
	`questions` text NOT NULL,
	`total` integer NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `attempts_user_idx` ON `attempts` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `attempts_asg_idx` ON `attempts` (`assignment_id`);--> statement-breakpoint
CREATE TABLE `bind_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `broadcast_receipts` (
	`broadcast_id` text NOT NULL,
	`user_id` text NOT NULL,
	`read_at` integer,
	PRIMARY KEY(`broadcast_id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `br_user_idx` ON `broadcast_receipts` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `broadcasts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`audience` text NOT NULL,
	`send_email` integer DEFAULT false NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	`recipients` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`grade` integer NOT NULL,
	`join_code` text NOT NULL,
	`join_mode` text DEFAULT 'closed' NOT NULL,
	`owner_id` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classes_code_uq` ON `classes` (`join_code`);--> statement-breakpoint
CREATE INDEX `classes_owner_idx` ON `classes` (`owner_id`);--> statement-breakpoint
CREATE TABLE `email_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`broadcast_id` text,
	`to_email` text NOT NULL,
	`subject` text NOT NULL,
	`html` text NOT NULL,
	`text` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error` text,
	`next_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `eq_status_idx` ON `email_queue` (`status`,`next_at`);--> statement-breakpoint
CREATE TABLE `mistakes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`tag` text NOT NULL,
	`fingerprint` text NOT NULL,
	`question` text NOT NULL,
	`times` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`resolved_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mistakes_fp_uq` ON `mistakes` (`user_id`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `mistakes_user_idx` ON `mistakes` (`user_id`,`resolved_at`);--> statement-breakpoint
CREATE TABLE `parent_links` (
	`parent_id` text NOT NULL,
	`student_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`parent_id`, `student_id`)
);
--> statement-breakpoint
CREATE TABLE `pending_registrations` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `unsubscribes` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `class_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `nickname` text;--> statement-breakpoint
ALTER TABLE `users` ADD `note` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_class_nick_uq` ON `users` (`class_id`,`nickname`);--> statement-breakpoint
CREATE INDEX `users_class_idx` ON `users` (`class_id`);