import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlatformConfigChargeIva1792600000000 implements MigrationInterface {
  name = 'AddPlatformConfigChargeIva1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_config" ADD COLUMN IF NOT EXISTS "charge_iva" boolean NOT NULL DEFAULT false;
      ALTER TABLE "platform_config" ADD COLUMN IF NOT EXISTS "iva_percentage" numeric(5, 2) NOT NULL DEFAULT 16.00;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "platform_config" DROP COLUMN IF EXISTS "charge_iva"`);
    await queryRunner.query(`ALTER TABLE "platform_config" DROP COLUMN IF EXISTS "iva_percentage"`);
  }
}
