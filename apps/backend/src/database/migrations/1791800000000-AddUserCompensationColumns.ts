import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserCompensationColumns1791800000000 implements MigrationInterface {
    name = 'AddUserCompensationColumns1791800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "salaryAmount" numeric(12,2)`);
        await queryRunner.query(`ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "salaryPeriod" character varying`);
        await queryRunner.query(`ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "compensation_type" character varying DEFAULT 'FIJO'`);
        await queryRunner.query(`ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "commission_percentage" numeric(5,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_tenant_access" DROP COLUMN IF EXISTS "commission_percentage"`);
        await queryRunner.query(`ALTER TABLE "user_tenant_access" DROP COLUMN IF EXISTS "compensation_type"`);
        await queryRunner.query(`ALTER TABLE "user_tenant_access" DROP COLUMN IF EXISTS "salaryPeriod"`);
        await queryRunner.query(`ALTER TABLE "user_tenant_access" DROP COLUMN IF EXISTS "salaryAmount"`);
    }
}
