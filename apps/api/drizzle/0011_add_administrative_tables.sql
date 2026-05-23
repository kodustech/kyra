CREATE TYPE "public"."invoice_status" AS ENUM('pending', 'issued', 'sent');--> statement-breakpoint
CREATE TABLE "billings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"stripe_invoice_id" text,
	"payment_date" timestamp with time zone,
	"amount_brl" numeric(12, 2),
	"amount_usd" numeric(12, 2),
	"exchange_rate" numeric(12, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billings_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "customer_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" text,
	"phone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cnpj" text,
	"state_registration" text,
	"company_name" text NOT NULL,
	"trade_name" text,
	"address" text,
	"number" text,
	"district" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"purchased_licenses" integer,
	"total_devs" integer,
	"due_day" integer,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"invoice_emails" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"stripe_invoice_id" text,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"amount" numeric(12, 2),
	"invoice_date" timestamp with time zone,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
ALTER TABLE "billings" ADD CONSTRAINT "billings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_billings_customer_id" ON "billings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_billings_payment_date" ON "billings" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "idx_customer_contacts_customer_id" ON "customer_contacts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customers_company_name" ON "customers" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "idx_customers_stripe_customer_id" ON "customers" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_customer_id" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_status" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invoices_invoice_date" ON "invoices" USING btree ("invoice_date");