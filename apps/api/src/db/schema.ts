import { boolean, index, jsonb, numeric, pgEnum, pgTable, text, integer, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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
	"assignee",
	"label",
	"lookup",
	"formula",
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
	"pending",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", ["pending", "issued", "sent"]);

export const nfseStatusEnum = pgEnum("nfse_status", [
	"not_issued",
	"processing",
	"authorized",
	"error",
	"cancelled",
]);

export const focusNfeEnvironmentEnum = pgEnum("focus_nfe_environment", ["sandbox", "production"]);

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
		slug: text().notNull(),
		type: fieldTypeEnum().notNull(),
		required: boolean().notNull().default(false),
		mask: text(),
		options: jsonb().$type<string[] | null>(),
		settings: jsonb().$type<{ options: { id: string; label: string; color: string; icon: string | null }[] } | null>(),
		lookupSettings: jsonb("lookup_settings").$type<{
			sourceDatabaseId: string;
			displayFieldId: string;
			valueFieldId?: string;
			filters: { fieldId: string; operator: string; value: string }[];
		} | null>(),
		formulaExpression: text("formula_expression"),
		highlight: boolean().notNull().default(false),
		position: integer().notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_fields_database_id").on(t.databaseId),
		index("idx_fields_position").on(t.databaseId, t.position),
		uniqueIndex("idx_fields_database_slug").on(t.databaseId, t.slug),
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
		showTitle: boolean("show_title").default(false),
		showBorder: boolean("show_border").default(false),
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

// ─── Comments ──────────────────────────────────────────────────────────────────

export const comments = pgTable(
	"comments",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		recordId: uuid("record_id").notNull().references(() => records.id, { onDelete: "cascade" }),
		authorId: uuid("author_id").notNull().references(() => users.id),
		content: text().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_comments_record_id").on(t.recordId),
	],
);

// ─── API Keys ──────────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
	"api_keys",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
		name: text().notNull(),
		keyHash: text("key_hash").notNull(),
		keyPrefix: text("key_prefix").notNull(),
		lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_api_keys_user_id").on(t.userId),
		index("idx_api_keys_key_hash").on(t.keyHash),
	],
);

// ─── Webhooks ──────────────────────────────────────────────────────────────────

export const webhooks = pgTable(
	"webhooks",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		name: text().notNull(),
		url: text().notNull(),
		active: boolean().notNull().default(true),
		createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_webhooks_active").on(t.active),
	],
);

// ─── Customers ─────────────────────────────────────────────────────────────────

export const customers = pgTable(
	"customers",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		cnpj: text(),
		stateRegistration: text("state_registration"),
		companyName: text("company_name").notNull(),
		tradeName: text("trade_name"),
		address: text(),
		number: text(),
		district: text(),
		city: text(),
		state: text(),
		zipCode: text("zip_code"),
		purchasedLicenses: integer("purchased_licenses"),
		totalDevs: integer("total_devs"),
		dueDay: integer("due_day"),
		stripeCustomerId: text("stripe_customer_id"),
		stripeSubscriptionId: text("stripe_subscription_id"),
		invoiceEmails: jsonb("invoice_emails").$type<string[] | null>(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_customers_company_name").on(t.companyName),
		index("idx_customers_stripe_customer_id").on(t.stripeCustomerId),
	],
);

// ─── Customer Contacts ────────────────────────────────────────────────────────

export const customerContacts = pgTable(
	"customer_contacts",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "cascade" }),
		name: text(),
		phone: text(),
		email: text(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_customer_contacts_customer_id").on(t.customerId),
	],
);

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const invoices = pgTable(
	"invoices",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "cascade" }),
		stripeInvoiceId: text("stripe_invoice_id").unique(),
		status: invoiceStatusEnum().notNull().default("pending"),
		amount: numeric({ precision: 12, scale: 2 }),
		invoiceDate: timestamp("invoice_date", { withTimezone: true }),
		description: text(),
		nfseStatus: nfseStatusEnum("nfse_status").notNull().default("not_issued"),
		nfseReference: text("nfse_reference").unique(),
		nfseNumber: text("nfse_number"),
		nfsePdfUrl: text("nfse_pdf_url"),
		nfseXmlUrl: text("nfse_xml_url"),
		nfseError: text("nfse_error"),
		nfseIssuedAt: timestamp("nfse_issued_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_invoices_customer_id").on(t.customerId),
		index("idx_invoices_status").on(t.status),
		index("idx_invoices_invoice_date").on(t.invoiceDate),
		index("idx_invoices_nfse_status").on(t.nfseStatus),
	],
);

// ─── Company Settings (singleton) ─────────────────────────────────────────────

export const companySettings = pgTable("company_settings", {
	id: uuid().primaryKey().default(sql`gen_random_uuid()`),
	cnpj: text().notNull(),
	companyName: text("company_name").notNull(),
	tradeName: text("trade_name"),
	municipalRegistration: text("municipal_registration"),
	stateRegistration: text("state_registration"),
	address: text(),
	number: text(),
	complement: text(),
	district: text(),
	city: text(),
	state: text(),
	zipCode: text("zip_code"),
	cityCode: text("city_code"),
	serviceItemCode: text("service_item_code"),
	municipalServiceCode: text("municipal_service_code"),
	issAliquot: numeric("iss_aliquot", { precision: 5, scale: 2 }),
	defaultDiscrimination: text("default_discrimination"),
	focusNfeToken: text("focus_nfe_token"),
	focusNfeEnvironment: focusNfeEnvironmentEnum("focus_nfe_environment").notNull().default("sandbox"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Billings ─────────────────────────────────────────────────────────────────

export const billings = pgTable(
	"billings",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "cascade" }),
		stripeInvoiceId: text("stripe_invoice_id").unique(),
		paymentDate: timestamp("payment_date", { withTimezone: true }),
		amountBrl: numeric("amount_brl", { precision: 12, scale: 2 }),
		amountUsd: numeric("amount_usd", { precision: 12, scale: 2 }),
		exchangeRate: numeric("exchange_rate", { precision: 12, scale: 4 }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_billings_customer_id").on(t.customerId),
		index("idx_billings_payment_date").on(t.paymentDate),
	],
);

// ─── Notifications ─────────────────────────────────────────────────────────────

export const notifications = pgTable(
	"notifications",
	{
		id: uuid().primaryKey().default(sql`gen_random_uuid()`),
		userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
		type: text().notNull(),
		actorId: uuid("actor_id").notNull().references(() => users.id),
		commentId: uuid("comment_id").references(() => comments.id, { onDelete: "cascade" }),
		recordId: uuid("record_id").references(() => records.id, { onDelete: "cascade" }),
		databaseId: uuid("database_id").references(() => databases.id, { onDelete: "cascade" }),
		recordTitle: text("record_title"),
		read: boolean().notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_notifications_user_id").on(t.userId),
		index("idx_notifications_user_unread").on(t.userId, t.read),
	],
);
