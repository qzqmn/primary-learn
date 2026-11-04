CREATE TABLE `content_packs` (
	`name` text PRIMARY KEY NOT NULL,
	`json` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`license` text NOT NULL,
	`source` text,
	`units` integer NOT NULL,
	`questions` integer NOT NULL,
	`uploaded_by` text,
	`created_at` integer NOT NULL
);
