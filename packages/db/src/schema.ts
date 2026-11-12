import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const memberRole = pgEnum("member_role", ["owner", "editor", "viewer"]);
export const listKind = pgEnum("list_kind", ["project", "shopping"]);
export const taskStatus = pgEnum("task_status", ["todo", "done"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// Money is stored as integer grosze (1/100 PLN).
export const lists = pgTable(
  "lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // "shopping" lists hold shopping items; each user has one global shopping list.
    kind: listKind("kind").notNull().default("project"),
    // Marks the list created for this user on first visit; at most one per user and kind.
    defaultForUserId: text("default_for_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("lists_default_for_user_kind_uq")
      .on(t.defaultForUserId, t.kind)
      .where(sql`${t.defaultForUserId} IS NOT NULL`),
  ],
);

export const listMembers = pgTable(
  "list_members",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("list_members_list_user_idx").on(t.listId, t.userId)],
);

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  listId: uuid("list_id")
    .notNull()
    .references(() => lists.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: memberRole("role").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    // Subtasks point at their parent task; access is inherited from the list.
    parentId: uuid("parent_id"),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("todo"),
    // Fractional-indexing key; compare with COLLATE "C".
    position: text("position").notNull(),
    estimateMinGrosze: integer("estimate_min_grosze"),
    estimateMaxGrosze: integer("estimate_max_grosze"),
    costGrosze: integer("cost_grosze"),
    // Two independent markers (D07); a subtask has its own, never inherited (D21).
    important: boolean("important").notNull().default(false),
    urgent: boolean("urgent").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("tasks_list_parent_idx").on(t.listId, t.parentId),
    // Target of the same-list parent FK below; must exist before it.
    unique("tasks_list_id_id_idx").on(t.listId, t.id),
    // MATCH SIMPLE: a top-level task (parent_id NULL) is not checked.
    foreignKey({
      name: "tasks_list_id_parent_id_fk",
      columns: [t.listId, t.parentId],
      foreignColumns: [t.listId, t.id],
    }).onDelete("cascade"),
    unique("tasks_sibling_position_uq").on(t.listId, t.parentId, t.position).nullsNotDistinct(),
    check(
      "tasks_estimate_pair_chk",
      sql`(${t.estimateMinGrosze} IS NULL) = (${t.estimateMaxGrosze} IS NULL)`,
    ),
    check(
      "tasks_estimate_range_chk",
      sql`${t.estimateMinGrosze} IS NULL OR (${t.estimateMinGrosze} >= 0 AND ${t.estimateMinGrosze} <= ${t.estimateMaxGrosze})`,
    ),
  ],
);

// Shopping items live in a "shopping" list, so sharing reuses list membership and invitations.
export const shoppingItems = pgTable(
  "shopping_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    checked: boolean("checked").notNull().default(false),
    position: text("position").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("shopping_items_list_idx").on(t.listId)],
);

export const listsRelations = relations(lists, ({ many }) => ({
  members: many(listMembers),
  tasks: many(tasks),
}));

// --- Better Auth tables (names/columns follow Better Auth's core schema) ---
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
