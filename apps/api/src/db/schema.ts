import { boolean, index, jsonb, pgEnum, pgTable, text, integer, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ──────────────────────────────────────────────────────────────────────

export const fieldTypeEnum = pgEnum("field_type", [
	"text",
	"number",
	"email",
	"phone",
	"date",
	"select",
	"boolean",
	"url",
	"textarea",
	"kanban_status",
]);

export const blockViewTypeEnum = pgEnum("block_view_type", [
	"form",
	"table",
	"richtext",
	"kanban",
]);

export const userRoleEnum = pgEnum("user_role", [
	"owner",
	"admin",
	"editor",
	"viewer",
]);

// ─── Users ──────────────────────────────────────────────────────────────────────

export const users = pgTable(
	"users",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		name: text().notNull(),
		email: text().notNull(),
		passwordHash: text("password_hash").notNull(),
		role: userRoleEnum().notNull().default("viewer"),
		color: text().notNull().default("#6366f1"),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("idx_users_email_active").on(t.email).where(sql`deleted_at IS NULL`),
	],
);

// ─── Invites ────────────────────────────────────────────────────────────────────

export const invites = pgTable(
	"invites",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		email: text().notNull(),
		name: text().notNull(),
		role: userRoleEnum().notNull().default("editor"),
		token: text().notNull().unique(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		acceptedAt: timestamp("accepted_at", { withTimezone: true }),
		invitedBy: uuid("invited_by").notNull().references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_invites_token").on(t.token),
		index("idx_invites_invited_by").on(t.invitedBy),
	],
);

// ─── Databases ──────────────────────────────────────────────────────────────────

export const databases = pgTable("databases", {
	id: uuid().primaryKey().default(sql`gen_random_uuid()`),
	name: text().notNull(),
	description: text(),
	position: integer(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Fields ─────────────────────────────────────────────────────────────────────

export const fields = pgTable(
	"fields",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		databaseId: uuid("database_id").notNull().references(() => databases.id, { onDelete: "cascade" }),
		name: text().notNull(),
		type: fieldTypeEnum().notNull(),
		required: boolean().notNull().default(false),
		mask: text(),
		options: jsonb().$type<string[] | null>(),
		settings: jsonb().$type<{ options: { id: string; label: string; color: string; icon: string | null }[] } | null>(),
		highlight: boolean().notNull().default(false),
		position: integer().notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_fields_database_id").on(t.databaseId),
		index("idx_fields_position").on(t.databaseId, t.position),
	],
);

// ─── Records ────────────────────────────────────────────────────────────────────

export const records = pgTable(
	"records",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		databaseId: uuid("database_id").notNull().references(() => databases.id, { onDelete: "cascade" }),
		data: jsonb().notNull().$type<Record<string, unknown>>(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_records_database_id").on(t.databaseId),
	],
);

// ─── Pages ──────────────────────────────────────────────────────────────────────

export const pages = pgTable(
	"pages",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		name: text().notNull(),
		slug: text().notNull().unique(),
		icon: text(),
		published: boolean().notNull().default(false),
		position: integer(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
);

// ─── Blocks ─────────────────────────────────────────────────────────────────────

export const blocks = pgTable(
	"blocks",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
		databaseId: uuid("database_id").references(() => databases.id, { onDelete: "cascade" }),
		viewType: blockViewTypeEnum("view_type").notNull(),
		content: text(),
		title: text(),
		icon: text(),
		showTitle: boolean("show_title").default(true),
		showBorder: boolean("show_border").default(true),
		position: integer().notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_blocks_page_id").on(t.pageId),
		index("idx_blocks_database_id").on(t.databaseId),
		index("idx_blocks_position").on(t.pageId, t.position),
	],
);
