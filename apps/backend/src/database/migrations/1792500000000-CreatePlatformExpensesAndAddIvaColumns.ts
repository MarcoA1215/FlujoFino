import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformExpensesAndAddIvaColumns1792500000000 implements MigrationInterface {
  name = 'CreatePlatformExpensesAndAddIvaColumns1792500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_expenses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying(50) NOT NULL,
        "category" character varying(100) NOT NULL,
        "description" text NOT NULL,
        "amount" numeric(12, 2) NOT NULL,
        "amount_bs" numeric(14, 2),
        "exchange_rate" numeric(10, 2),
        "payment_method" character varying(50) DEFAULT 'TRANSFERENCIA',
        "reference" character varying(255),
        "expense_date" TIMESTAMP NOT NULL DEFAULT now(),
        "tax_period" character varying(50),
        "promoter_id" uuid,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_expenses_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_platform_expenses_promoter" FOREIGN KEY ("promoter_id") REFERENCES "promoters"("id") ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS "IDX_platform_expenses_type" ON "platform_expenses" ("type");
      CREATE INDEX IF NOT EXISTS "IDX_platform_expenses_expense_date" ON "platform_expenses" ("expense_date");
      CREATE INDEX IF NOT EXISTS "IDX_platform_expenses_category" ON "platform_expenses" ("category");

      ALTER TABLE "saas_payment_reports" ADD COLUMN IF NOT EXISTS "subtotal" numeric(10, 2);
      ALTER TABLE "saas_payment_reports" ADD COLUMN IF NOT EXISTS "iva_amount" numeric(10, 2);

      UPDATE "saas_payment_reports"
      SET
        "subtotal" = ROUND("amount" / 1.16, 2),
        "iva_amount" = ROUND("amount" - ROUND("amount" / 1.16, 2), 2)
      WHERE "subtotal" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_expenses"`);
    await queryRunner.query(`ALTER TABLE "saas_payment_reports" DROP COLUMN IF EXISTS "subtotal"`);
    await queryRunner.query(`ALTER TABLE "saas_payment_reports" DROP COLUMN IF EXISTS "iva_amount"`);
  }
}
