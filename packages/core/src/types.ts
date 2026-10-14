import type { schema } from "@taskly/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type Db = NodePgDatabase<typeof schema>;
