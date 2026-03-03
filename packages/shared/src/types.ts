import { z } from "zod";

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
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

// ─── Domain Types ───────────────────────────────────────────────────────────────

export interface Database {
	id: string;
	name: string;
	description: string | null;
	created_at: string;
	updated_at: string;
}

export interface Field {
	id: string;
	database_id: string;
	name: string;
	type: FieldType;
	required: boolean;
	mask: string | null;
	options: string[] | null;
	position: number;
	created_at: string;
	updated_at: string;
}

export interface Record {
	id: string;
	database_id: string;
	data: { [fieldId: string]: unknown };
	created_at: string;
	updated_at: string;
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

export type CreateDatabaseInput = z.infer<typeof createDatabaseSchema>;
export type UpdateDatabaseInput = z.infer<typeof updateDatabaseSchema>;

// ─── Zod Schemas: Fields ────────────────────────────────────────────────────────

export const fieldTypeSchema = z.enum(FIELD_TYPES);

export const createFieldSchema = z
	.object({
		name: z.string().min(1, "Name is required").max(255),
		type: fieldTypeSchema,
		required: z.boolean().default(false),
		mask: z.string().max(255).nullable().optional(),
		options: z.array(z.string()).nullable().optional(),
	})
	.refine(
		(data) => {
			if (data.type === "select") {
				return data.options && data.options.length > 0;
			}
			return true;
		},
		{ message: "Select fields must have at least one option", path: ["options"] },
	);

export const updateFieldSchema = z
	.object({
		name: z.string().min(1).max(255).optional(),
		type: fieldTypeSchema.optional(),
		required: z.boolean().optional(),
		mask: z.string().max(255).nullable().optional(),
		options: z.array(z.string()).nullable().optional(),
	})
	.refine(
		(data) => {
			if (data.type === "select" && data.options !== undefined) {
				return data.options && data.options.length > 0;
			}
			return true;
		},
		{ message: "Select fields must have at least one option", path: ["options"] },
	);

export const reorderFieldsSchema = z.object({
	fieldIds: z.array(z.string().uuid()).min(1),
});

export type CreateFieldInput = z.infer<typeof createFieldSchema>;
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
