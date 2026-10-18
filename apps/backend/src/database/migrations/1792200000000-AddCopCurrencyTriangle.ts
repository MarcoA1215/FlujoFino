import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCopCurrencyTriangle1792200000000 implements MigrationInterface {
  name = 'AddCopCurrencyTriangle1792200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "enableCopCurrency" boolean DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "exchangeRateCop" numeric(12,4) DEFAULT 4000`);
    await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "exchangeRateCopMode" character varying DEFAULT 'MANUAL'`);
    await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "manualExchangeRateCop" numeric(12,4)`);
    await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "companyCopBank" character varying`);
    await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "companyCopAccountNumber" character varying`);
    await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "companyCopAccountHolder" character varying`);
    await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "acceptCashCop" boolean DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "acceptTransferCop" boolean DEFAULT false`);

    await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "amountCop" numeric(14,2)`);
    await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "exchangeRateCop" numeric(12,4)`);
    await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "copReceived" numeric(14,2)`);
    await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "changeAmountCop" numeric(14,2)`);
    await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "copRef" character varying`);
    await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "copBank" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "copBank"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "copRef"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "changeAmountCop"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "copReceived"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "exchangeRateCop"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "amountCop"`);

    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "acceptTransferCop"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "acceptCashCop"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "companyCopAccountHolder"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "companyCopAccountNumber"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "companyCopBank"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "manualExchangeRateCop"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "exchangeRateCopMode"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "exchangeRateCop"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "enableCopCurrency"`);
  }
}
