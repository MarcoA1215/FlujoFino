import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrencyColumnsToOperatingExpenses1793200000000 implements MigrationInterface {
  name = 'AddCurrencyColumnsToOperatingExpenses1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operating_expenses"
      ADD COLUMN IF NOT EXISTS "amountBs" numeric(14,2),
      ADD COLUMN IF NOT EXISTS "exchangeRate" numeric(12,4),
      ADD COLUMN IF NOT EXISTS "amountCop" numeric(14,2),
      ADD COLUMN IF NOT EXISTS "exchangeRateCop" numeric(12,4);
    `);

    // Backfill calibrado para Exótica Nails Spa (Eva) preservando el cierre de ayer con tasa 889.26
    await queryRunner.query(`
      UPDATE "operating_expenses"
      SET "exchangeRate" = 889.2600,
          "amountBs" = ROUND("amount" * 889.2600, 2)
      WHERE "tenantId" = '6912e582-0b7d-4bcd-8901-2b62eb2987ec'
        AND "amountBs" IS NULL;
    `);

    // Backfill para otros tenants utilizando la tasa configurada en sus settings
    await queryRunner.query(`
      UPDATE "operating_expenses" e
      SET "exchangeRate" = COALESCE(s."exchangeRateBs", 40.0),
          "amountBs" = ROUND(e."amount" * COALESCE(s."exchangeRateBs", 40.0), 2)
      FROM "settings" s
      WHERE s."tenantId" = e."tenantId"
        AND e."amountBs" IS NULL;
    `);

    // Fallback general para cualquier registro huérfano sin tenant
    await queryRunner.query(`
      UPDATE "operating_expenses"
      SET "exchangeRate" = 40.0,
          "amountBs" = ROUND("amount" * 40.0, 2)
      WHERE "amountBs" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operating_expenses"
      DROP COLUMN IF EXISTS "amountBs",
      DROP COLUMN IF EXISTS "exchangeRate",
      DROP COLUMN IF EXISTS "amountCop",
      DROP COLUMN IF EXISTS "exchangeRateCop";
    `);
  }
}
