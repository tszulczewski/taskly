ALTER TABLE "tasks" ADD COLUMN "important" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "urgent" boolean DEFAULT false NOT NULL;