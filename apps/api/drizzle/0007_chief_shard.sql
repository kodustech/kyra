ALTER TYPE "public"."field_type" ADD VALUE 'lookup';--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "lookup_settings" jsonb;