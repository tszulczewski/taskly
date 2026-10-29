ALTER TABLE "lists" ADD COLUMN "default_for_user_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_default_for_user_id_user_id_fk" FOREIGN KEY ("default_for_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Moved by hand: the same-list parent FK below references this unique, so it must exist first.
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_list_id_id_idx" UNIQUE("list_id","id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_list_id_parent_id_fk" FOREIGN KEY ("list_id","parent_id") REFERENCES "public"."tasks"("list_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lists_default_for_user_kind_uq" ON "lists" USING btree ("default_for_user_id","kind") WHERE "lists"."default_for_user_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sibling_position_uq" UNIQUE NULLS NOT DISTINCT("list_id","parent_id","position");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_estimate_pair_chk" CHECK (("tasks"."estimate_min_grosze" IS NULL) = ("tasks"."estimate_max_grosze" IS NULL));--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_estimate_range_chk" CHECK ("tasks"."estimate_min_grosze" IS NULL OR ("tasks"."estimate_min_grosze" >= 0 AND "tasks"."estimate_min_grosze" <= "tasks"."estimate_max_grosze"));