import { z } from "zod";

// ─── User Roles ─────────────────────────────────────────────────────────────────

export const USER_ROLES = ["owner", "admin", "editor", "viewer", "pending"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	color: string;
	deletedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AuthUser {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	color: string;
}

export interface Invite {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	token: string;
	expiresAt: string;
	acceptedAt: string | null;
	invitedBy: string;
	createdAt: string;
}

// ─── Auth Zod Schemas ───────────────────────────────────────────────────────────

export const setupSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	email: z.string().email("Invalid email"),
	password: z.string().min(6, "Password must be at least 6 characters"),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").default("#6366f1"),
});

export const loginSchema = z.object({
	email: z.string().email("Invalid email"),
	password: z.string().min(1, "Password is required"),
});

export const createInviteSchema = z.object({
	emails: z.array(z.string().email("Invalid email")).min(1, "At least one email is required"),
});

export const acceptInviteSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	password: z.string().min(6, "Password must be at least 6 characters"),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").default("#6366f1"),
});

export const updateUserSchema_auth = z.object({
	name: z.string().min(1).max(255).optional(),
	role: z.enum(USER_ROLES).optional(),
});

export const updateProfileSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").optional(),
	password: z.string().min(6).optional(),
});

export const transferOwnershipSchema = z.object({
	newOwnerId: z.string().uuid("Invalid user ID"),
});

export type SetupInput = z.infer<typeof setupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type UpdateUserAuthInput = z.infer<typeof updateUserSchema_auth>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

// ─── Permission Helpers ─────────────────────────────────────────────────────────

export function canManageUsers(role: UserRole): boolean {
	return role === "owner" || role === "admin";
}

export function canManageDatabases(role: UserRole): boolean {
	return role === "owner" || role === "admin";
}

export function canEditContent(role: UserRole): boolean {
	return role === "owner" || role === "admin" || role === "editor";
}

export function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
	if (actorRole === "owner") return true;
	if (actorRole === "admin") return targetRole === "editor" || targetRole === "viewer" || targetRole === "pending";
	return false;
}

export function canTransferOwnership(role: UserRole): boolean {
	return role === "owner";
}

// ─── Utility Helpers ────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
	return name
		.split(" ")
		.filter(Boolean)
		.map((w) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

// ─── View Types ─────────────────────────────────────────────────────────────────

export const VIEW_TYPES = ["form", "table", "richtext", "kanban"] as const;

export type ViewType = (typeof VIEW_TYPES)[number];

// ─── Field Types ────────────────────────────────────────────────────────────────

export const FIELD_TYPES = [
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
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

// ─── Kanban Status ──────────────────────────────────────────────────────────────

export interface KanbanStatusOption {
	id: string;
	label: string;
	color: string;
	icon: string | null;
}

export type LabelOption = KanbanStatusOption;

// ─── Lookup Settings ────────────────────────────────────────────────────────────

export const LOOKUP_OPERATORS = ["eq", "neq", "gt", "lt", "gte", "lte", "contains", "is_null", "is_not_null"] as const;
export type LookupOperator = (typeof LOOKUP_OPERATORS)[number];

export interface LookupFilter {
	fieldId: string;
	operator: LookupOperator;
	value: string;
}

export interface LookupSettings {
	sourceDatabaseId: string;
	displayFieldId: string;
	valueFieldId?: string;
	filters: LookupFilter[];
}

// ─── Domain Types ───────────────────────────────────────────────────────────────

export interface Database {
	id: string;
	name: string;
	description: string | null;
	position: number;
	createdAt: string;
	updatedAt: string;
}

export interface Field {
	id: string;
	databaseId: string;
	name: string;
	slug: string;
	type: FieldType;
	required: boolean;
	mask: string | null;
	options: string[] | null;
	settings: { options: KanbanStatusOption[] } | null;
	lookupSettings: LookupSettings | null;
	formulaExpression: string | null;
	highlight: boolean;
	position: number;
	createdAt: string;
	updatedAt: string;
}

export interface Record {
	id: string;
	databaseId: string;
	data: { [fieldId: string]: unknown };
	createdAt: string;
	updatedAt: string;
}

// ─── Pages & Blocks ────────────────────────────────────────────────────────────

export interface Page {
	id: string;
	name: string;
	slug: string;
	icon: string | null;
	published: boolean;
	position: number;
	createdAt: string;
	updatedAt: string;
}

export interface Block {
	id: string;
	pageId: string;
	databaseId: string | null;
	viewType: ViewType;
	content: string | null;
	title: string | null;
	icon: string | null;
	showTitle: boolean;
	showBorder: boolean;
	position: number;
	createdAt: string;
	updatedAt: string;
}

export interface BlockWithRelations extends Block {
	database: Database | null;
	fields: Field[];
}

export interface PageWithBlocks extends Page {
	blocks: (BlockWithRelations & { records: Record[] })[];
}

// ─── Zod Schemas: Databases ─────────────────────────────────────────────────────

export const createDatabaseSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	description: z.string().max(1000).nullable().optional(),
});

export const updateDatabaseSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	description: z.string().max(1000).nullable().optional(),
});

export const reorderDatabasesSchema = z.object({
	databaseIds: z.array(z.string().uuid()).min(1),
});

export type CreateDatabaseInput = z.infer<typeof createDatabaseSchema>;
export type UpdateDatabaseInput = z.infer<typeof updateDatabaseSchema>;
export type ReorderDatabasesInput = z.infer<typeof reorderDatabasesSchema>;

// ─── Zod Schemas: Fields ────────────────────────────────────────────────────────

export const fieldTypeSchema = z.enum(FIELD_TYPES);

export const kanbanStatusOptionSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	color: z.string().min(1),
	icon: z.string().nullable(),
});

export const lookupFilterSchema = z.object({
	fieldId: z.string().uuid(),
	operator: z.enum(LOOKUP_OPERATORS),
	value: z.string(),
});

export const lookupSettingsSchema = z.object({
	sourceDatabaseId: z.string().uuid(),
	displayFieldId: z.string().uuid(),
	valueFieldId: z.string().uuid().optional(),
	filters: z.array(lookupFilterSchema),
});

export const createFieldSchema = z
	.object({
		name: z.string().min(1, "Name is required").max(255),
		type: fieldTypeSchema,
		required: z.boolean().default(false),
		mask: z.string().max(255).nullable().optional(),
		options: z.array(z.string()).nullable().optional(),
		settings: z.object({ options: z.array(kanbanStatusOptionSchema) }).nullable().optional(),
		lookupSettings: lookupSettingsSchema.nullable().optional(),
		formulaExpression: z.string().max(2000).nullable().optional(),
		highlight: z.boolean().default(false),
	})
	.refine(
		(data) => {
			if (data.type === "select") {
				return data.options && data.options.length > 0;
			}
			return true;
		},
		{ message: "Select fields must have at least one option", path: ["options"] },
	)
	.refine(
		(data) => {
			if (data.type === "lookup") {
				return data.lookupSettings != null;
			}
			return true;
		},
		{ message: "Lookup fields must have lookup settings configured", path: ["lookupSettings"] },
	)
	.refine(
		(data) => {
			if (data.type === "formula") {
				return data.formulaExpression != null && data.formulaExpression.trim().length > 0;
			}
			return true;
		},
		{ message: "Formula fields must have an expression", path: ["formulaExpression"] },
	);

export const updateFieldSchema = z
	.object({
		name: z.string().min(1).max(255).optional(),
		slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
		type: fieldTypeSchema.optional(),
		required: z.boolean().optional(),
		mask: z.string().max(255).nullable().optional(),
		options: z.array(z.string()).nullable().optional(),
		settings: z.object({ options: z.array(kanbanStatusOptionSchema) }).nullable().optional(),
		lookupSettings: lookupSettingsSchema.nullable().optional(),
		formulaExpression: z.string().max(2000).nullable().optional(),
		highlight: z.boolean().optional(),
	})
	.refine(
		(data) => {
			if (data.type === "select" && data.options !== undefined) {
				return data.options && data.options.length > 0;
			}
			return true;
		},
		{ message: "Select fields must have at least one option", path: ["options"] },
	)
	.refine(
		(data) => {
			if (data.type === "lookup" && data.lookupSettings === undefined) {
				return false;
			}
			return true;
		},
		{ message: "Lookup fields must have lookup settings configured", path: ["lookupSettings"] },
	);

export const reorderFieldsSchema = z.object({
	fieldIds: z.array(z.string().uuid()).min(1),
});

export const bulkCreateFieldsSchema = z.object({
	fields: z.array(createFieldSchema).min(1),
});

export type CreateFieldInput = z.infer<typeof createFieldSchema>;
export type BulkCreateFieldsInput = z.infer<typeof bulkCreateFieldsSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;
export type ReorderFieldsInput = z.infer<typeof reorderFieldsSchema>;

// ─── Zod Schemas: Records ───────────────────────────────────────────────────────

export const createRecordSchema = z.object({
	data: z.record(z.string(), z.unknown()),
});

export const updateRecordSchema = z.object({
	data: z.record(z.string(), z.unknown()),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;

// ─── Zod Schemas: Pages ────────────────────────────────────────────────────────

export const viewTypeSchema = z.enum(VIEW_TYPES);

export const createPageSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	slug: z
		.string()
		.min(1, "Slug is required")
		.max(255)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
	icon: z.string().max(50).nullable().optional(),
	published: z.boolean().default(false),
});

export const updatePageSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	slug: z
		.string()
		.min(1)
		.max(255)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
		.optional(),
	icon: z.string().max(50).nullable().optional(),
	published: z.boolean().optional(),
});

export const reorderPagesSchema = z.object({
	pageIds: z.array(z.string().uuid()).min(1),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type ReorderPagesInput = z.infer<typeof reorderPagesSchema>;

// ─── Zod Schemas: Blocks ───────────────────────────────────────────────────────

export const createBlockSchema = z.discriminatedUnion("viewType", [
	z.object({
		viewType: z.literal("form"),
		databaseId: z.string().uuid("Invalid database ID"),
	}),
	z.object({
		viewType: z.literal("table"),
		databaseId: z.string().uuid("Invalid database ID"),
	}),
	z.object({
		viewType: z.literal("richtext"),
		content: z.string().optional(),
	}),
	z.object({
		viewType: z.literal("kanban"),
		databaseId: z.string().uuid("Invalid database ID"),
	}),
]);

export const updateBlockSchema = z.object({
	databaseId: z.string().uuid().optional(),
	viewType: viewTypeSchema.optional(),
	content: z.string().optional(),
	title: z.string().nullable().optional(),
	icon: z.string().nullable().optional(),
	showTitle: z.boolean().optional(),
	showBorder: z.boolean().optional(),
});

export const reorderBlocksSchema = z.object({
	blockIds: z.array(z.string().uuid()).min(1),
});

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;
export type ReorderBlocksInput = z.infer<typeof reorderBlocksSchema>;

// ─── Comments ───────────────────────────────────────────────────────────────────

export interface Comment {
	id: string;
	recordId: string;
	authorId: string;
	content: string;
	createdAt: string;
	updatedAt: string;
}

export interface CommentWithAuthor extends Comment {
	author: { id: string; name: string; color: string };
}

export const createCommentSchema = z.object({
	content: z.string().min(1, "Comment cannot be empty").max(10000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// ─── Notifications ──────────────────────────────────────────────────────────────

export interface Notification {
	id: string;
	userId: string;
	type: string;
	actorId: string;
	commentId: string | null;
	recordId: string | null;
	databaseId: string | null;
	recordTitle: string | null;
	read: boolean;
	createdAt: string;
}

export interface NotificationWithActor extends Notification {
	actor: { id: string; name: string; color: string };
}

// ─── API Keys ───────────────────────────────────────────────────────────────

export interface ApiKey {
	id: string;
	userId: string;
	name: string;
	keyPrefix: string;
	lastUsedAt: string | null;
	createdAt: string;
}

export const createApiKeySchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

// ─── Webhooks ───────────────────────────────────────────────────────────────

export interface Webhook {
	id: string;
	name: string;
	url: string;
	active: boolean;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

export const createWebhookSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	url: z.string().url("Invalid URL"),
});

export const updateWebhookSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	url: z.string().url("Invalid URL").optional(),
	active: z.boolean().optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;

// ─── Slug Helpers ───────────────────────────────────────────────────────────────

export function toSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Resolves record data keys from slugs to field IDs.
 * Accepts both slugs and UUIDs as keys — UUIDs pass through unchanged.
 */
export function resolveRecordSlugs(
	data: { [key: string]: unknown },
	fields: Field[],
): { [key: string]: unknown } {
	const slugToId = new Map(fields.map((f) => [f.slug, f.id]));
	const fieldIds = new Set(fields.map((f) => f.id));
	const resolved: { [key: string]: unknown } = {};

	for (const [key, value] of Object.entries(data)) {
		if (fieldIds.has(key)) {
			// Already a field ID
			resolved[key] = value;
		} else if (slugToId.has(key)) {
			// It's a slug — resolve to ID
			resolved[slugToId.get(key)!] = value;
		} else {
			// Unknown key — pass through (will fail validation if invalid)
			resolved[key] = value;
		}
	}

	return resolved;
}

// ─── Dynamic Record Validator ───────────────────────────────────────────────────

export function buildRecordValidator(fields: Field[]) {
	const shape: { [key: string]: z.ZodTypeAny } = {};

	for (const field of fields) {
		let fieldSchema: z.ZodTypeAny;

		switch (field.type) {
			case "text":
			case "textarea":
				fieldSchema = z.string();
				break;
			case "number":
				fieldSchema = z.coerce.number();
				break;
			case "email":
				fieldSchema = z.string().email("Invalid email");
				break;
			case "phone":
				fieldSchema = z.string();
				break;
			case "url":
				fieldSchema = z.string().url("Invalid URL");
				break;
			case "date":
				fieldSchema = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
					message: "Invalid date",
				});
				break;
			case "boolean":
				fieldSchema = z.coerce.boolean();
				break;
			case "select":
				if (field.options && field.options.length > 0) {
					fieldSchema = z.enum(field.options as [string, ...string[]]);
				} else {
					fieldSchema = z.string();
				}
				break;
			case "kanban_status":
			case "label":
				if (field.settings?.options && field.settings.options.length > 0) {
					const ids = field.settings.options.map((o) => o.id) as [string, ...string[]];
					fieldSchema = z.enum(ids);
				} else {
					fieldSchema = z.string();
				}
				break;
			case "lookup":
				fieldSchema = z.string();
				break;
			case "assignee":
				fieldSchema = z.string();
				break;
			case "formula":
				// Formula fields are computed server-side, skip validation
				continue;
			default:
				fieldSchema = z.string();
		}

		// Apply mask as regex validation
		if (field.mask) {
			const regex = new RegExp(field.mask);
			fieldSchema = fieldSchema.refine((v: unknown) => regex.test(String(v)), {
				message: `Value must match pattern: ${field.mask}`,
			});
		}

		// Apply required/optional
		if (!field.required) {
			fieldSchema = fieldSchema.optional().or(z.literal("")).or(z.null());
		}

		shape[field.id] = fieldSchema;
	}

	return z.object(shape as z.ZodRawShape);
}
