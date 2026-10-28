import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFiscalInvoicesAndAddFiscalColumns1792600000000 implements MigrationInterface {
  name = 'CreateFiscalInvoicesAndAddFiscalColumns1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tipos ENUM para Facturación Fiscal (PostgreSQL)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."fiscal_invoices_documenttype_enum" AS ENUM('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "public"."fiscal_invoices_provider_enum" AS ENUM('INTERNAL', 'UNIDIGITAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "public"."fiscal_invoices_status_enum" AS ENUM('DRAFT', 'PENDING_FISCAL', 'ISSUED', 'REJECTED', 'CANCELED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Crear tabla fiscal_invoices si no existe
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fiscal_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "orderId" uuid,
        "documentType" "public"."fiscal_invoices_documenttype_enum" NOT NULL DEFAULT 'INVOICE',
        "provider" "public"."fiscal_invoices_provider_enum" NOT NULL DEFAULT 'INTERNAL',
        "status" "public"."fiscal_invoices_status_enum" NOT NULL DEFAULT 'DRAFT',
        "invoiceNumber" character varying NOT NULL,
        "fiscalControlNumber" character varying,
        "series" character varying DEFAULT 'A',
        "customerName" character varying NOT NULL,
        "customerRif" character varying NOT NULL,
        "customerAddress" character varying,
        "customerPhone" character varying,
        "subtotalExempt" numeric(12,4) NOT NULL DEFAULT 0,
        "taxableBase" numeric(12,4) NOT NULL DEFAULT 0,
        "taxRate" numeric(5,2) NOT NULL DEFAULT 16.00,
        "taxAmount" numeric(12,4) NOT NULL DEFAULT 0,
        "totalAmount" numeric(12,4) NOT NULL DEFAULT 0,
        "amountBs" numeric(12,4) NOT NULL DEFAULT 0,
        "exchangeRate" numeric(12,4) NOT NULL DEFAULT 1,
        "externalGuid" character varying,
        "qrCodeUrl" character varying,
        "pdfUrl" character varying,
        "rejectionReason" character varying,
        "items" jsonb,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_fiscal_invoices_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fiscal_invoices_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION,
        CONSTRAINT "FK_fiscal_invoices_order" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS "IDX_fiscal_invoices_tenantId" ON "fiscal_invoices" ("tenantId");
      CREATE INDEX IF NOT EXISTS "IDX_fiscal_invoices_orderId" ON "fiscal_invoices" ("orderId");
      CREATE INDEX IF NOT EXISTS "IDX_fiscal_invoices_status" ON "fiscal_invoices" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_fiscal_invoices_invoiceNumber" ON "fiscal_invoices" ("invoiceNumber");
      CREATE INDEX IF NOT EXISTS "IDX_fiscal_invoices_customerRif" ON "fiscal_invoices" ("customerRif");
      CREATE INDEX IF NOT EXISTS "IDX_fiscal_invoices_externalGuid" ON "fiscal_invoices" ("externalGuid");
      CREATE INDEX IF NOT EXISTS "IDX_fiscal_invoices_tenant_created" ON "fiscal_invoices" ("tenantId", "createdAt");
      CREATE INDEX IF NOT EXISTS "IDX_fiscal_invoices_tenant_inv" ON "fiscal_invoices" ("tenantId", "invoiceNumber");
    `);

    // 3. Columnas fiscales y de pago en tabla "order"
    await queryRunner.query(`
      ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "subtotalExempt" numeric(12,4) NOT NULL DEFAULT 0;
      ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "taxableBase" numeric(12,4) NOT NULL DEFAULT 0;
      ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "taxAmount" numeric(12,4) NOT NULL DEFAULT 0;
      ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "fiscalInvoiceId" character varying;
      ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "fiscalStatus" character varying;
      ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "bsReceived" numeric(12,4);
      CREATE INDEX IF NOT EXISTS "IDX_order_fiscalInvoiceId" ON "order" ("fiscalInvoiceId");
    `);

    // 4. Columnas fiscales en tabla "order_item"
    await queryRunner.query(`
      ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "isTaxExempt" boolean NOT NULL DEFAULT false;
      ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "taxRate" numeric(5,2) NOT NULL DEFAULT 16.00;
      ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "taxAmount" numeric(12,2) NOT NULL DEFAULT 0;
    `);

    // 5. Columnas fiscales en tabla "product"
    await queryRunner.query(`
      ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "isTaxExempt" boolean NOT NULL DEFAULT false;
      ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "taxRate" numeric(5,2) NOT NULL DEFAULT 16.00;
    `);

    // 6. Columnas fiscales en tabla "product_variant"
    await queryRunner.query(`
      ALTER TABLE "product_variant" ADD COLUMN IF NOT EXISTS "isTaxExempt" boolean NOT NULL DEFAULT false;
      ALTER TABLE "product_variant" ADD COLUMN IF NOT EXISTS "taxRate" numeric(5,2) NOT NULL DEFAULT 16.00;
    `);

    // 7. Columna de bloqueo en tabla "reservation"
    await queryRunner.query(`
      ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "isBlock" boolean NOT NULL DEFAULT false;
    `);

    // 8. Columnas fiscales y de configuración en tabla "settings"
    await queryRunner.query(`
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "companyCopAccountType" character varying;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "companyCopCedula" character varying;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "acceptCashBs" boolean NOT NULL DEFAULT true;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "featureFiscalSupport" boolean NOT NULL DEFAULT false;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalDefaultTaxRate" numeric(5,2) NOT NULL DEFAULT 16.00;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalRif" character varying;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalCompanyName" character varying;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalAddress" character varying;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalPhone" character varying;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "fiscalMode" character varying NOT NULL DEFAULT 'INTERNAL';
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "initialCashBs" numeric(12,2) NOT NULL DEFAULT 0;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "initialCashCop" numeric(14,2) NOT NULL DEFAULT 0;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "initialBankCop" numeric(14,2) NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_invoices"`);
    await queryRunner.query(`
      ALTER TABLE "order" 
        DROP COLUMN IF EXISTS "subtotalExempt",
        DROP COLUMN IF EXISTS "taxableBase",
        DROP COLUMN IF EXISTS "taxAmount",
        DROP COLUMN IF EXISTS "fiscalInvoiceId",
        DROP COLUMN IF EXISTS "fiscalStatus",
        DROP COLUMN IF EXISTS "bsReceived";
    `);
    await queryRunner.query(`
      ALTER TABLE "order_item" 
        DROP COLUMN IF EXISTS "isTaxExempt",
        DROP COLUMN IF EXISTS "taxRate",
        DROP COLUMN IF EXISTS "taxAmount";
    `);
    await queryRunner.query(`
      ALTER TABLE "product" 
        DROP COLUMN IF EXISTS "isTaxExempt",
        DROP COLUMN IF EXISTS "taxRate";
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variant" 
        DROP COLUMN IF EXISTS "isTaxExempt",
        DROP COLUMN IF EXISTS "taxRate";
    `);
    await queryRunner.query(`
      ALTER TABLE "reservation" 
        DROP COLUMN IF EXISTS "isBlock";
    `);
    await queryRunner.query(`
      ALTER TABLE "settings" 
        DROP COLUMN IF EXISTS "companyCopAccountType",
        DROP COLUMN IF EXISTS "companyCopCedula",
        DROP COLUMN IF EXISTS "acceptCashBs",
        DROP COLUMN IF EXISTS "featureFiscalSupport",
        DROP COLUMN IF EXISTS "fiscalDefaultTaxRate",
        DROP COLUMN IF EXISTS "fiscalRif",
        DROP COLUMN IF EXISTS "fiscalCompanyName",
        DROP COLUMN IF EXISTS "fiscalAddress",
        DROP COLUMN IF EXISTS "fiscalPhone",
        DROP COLUMN IF EXISTS "fiscalMode",
        DROP COLUMN IF EXISTS "initialCashBs",
        DROP COLUMN IF EXISTS "initialCashCop",
        DROP COLUMN IF EXISTS "initialBankCop";
    `);
  }
}
