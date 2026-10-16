import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSettingsLogoAndProductColumns1792000000000 implements MigrationInterface {
    name = 'AddSettingsLogoAndProductColumns1792000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "companyLogoUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logoShape" character varying DEFAULT 'ROUNDED'`);
        await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logoFit" character varying DEFAULT 'contain'`);
        await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "bookingAllowStaffSelection" boolean DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "duration_minutes" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "duration_minutes"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "bookingAllowStaffSelection"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "logoFit"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "logoShape"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "companyLogoUrl"`);
    }
}
