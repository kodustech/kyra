ALTER TYPE "public"."field_type" ADD VALUE 'formula';--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "formula_expression" text;