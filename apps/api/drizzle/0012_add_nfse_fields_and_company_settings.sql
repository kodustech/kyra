CREATE TYPE "public"."focus_nfe_environment" AS ENUM('sandbox', 'production');--> statement-breakpoint
CREATE TYPE "public"."nfse_status" AS ENUM('not_issued', 'processing', 'authorized', 'error', 'cancelled');--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cnpj" text NOT NULL,
	"company_name" text NOT NULL,
	"trade_name" text,
	"municipal_registration" text,
	"state_registration" text,
	"address" text,
	"number" text,
	"complement" text,
	"district" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"city_code" text,
	"service_item_code" text,
	"municipal_service_code" text,
	"iss_aliquot" numeric(5, 2),
	"default_discrimination" text,
	"focus_nfe_token" text,
	"focus_nfe_environment" "focus_nfe_environment" DEFAULT 'sandbox' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "nfse_status" "nfse_status" DEFAULT 'not_issued' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "nfse_reference" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "nfse_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "nfse_pdf_url" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "nfse_xml_url" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "nfse_error" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "nfse_issued_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_invoices_nfse_status" ON "invoices" USING btree ("nfse_status");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_nfse_reference_unique" UNIQUE("nfse_reference");