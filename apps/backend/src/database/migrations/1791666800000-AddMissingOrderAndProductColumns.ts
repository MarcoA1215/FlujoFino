import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingOrderAndProductColumns1791666800000 implements MigrationInterface {
    name = 'AddMissingOrderAndProductColumns1791666800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Columnas de Order para vueltos y referencias
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "changePhone" character varying`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "changeBank" character varying`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "changeAmount" numeric(12,4)`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "changeAmountBs" numeric(12,4)`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "changeMethod" character varying`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "changeRef" character varying`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "usdReceived" numeric(12,4)`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "puntoRef" character varying`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "puntoBank" character varying`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "binanceRef" character varying`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "transferRef" character varying`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "transferBank" character varying`);

        // Columnas de Producto
        await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "durationMinutes" integer`);

        // Columnas de UserTenantAccess
        await queryRunner.query(`ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "job_title" character varying`);
        await queryRunner.query(`ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "entry_time" character varying`);
        await queryRunner.query(`ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "exit_time" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_tenant_access" DROP COLUMN IF EXISTS "exit_time"`);
        await queryRunner.query(`ALTER TABLE "user_tenant_access" DROP COLUMN IF EXISTS "entry_time"`);
        await queryRunner.query(`ALTER TABLE "user_tenant_access" DROP COLUMN IF EXISTS "job_title"`);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "durationMinutes"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "transferBank"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "transferRef"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "binanceRef"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "puntoBank"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "puntoRef"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "usdReceived"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "changeRef"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "changeMethod"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "changeAmountBs"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "changeAmount"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "changeBank"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "changePhone"`);
    }
}
