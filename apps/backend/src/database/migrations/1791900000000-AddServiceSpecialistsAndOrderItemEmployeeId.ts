import { MigrationInterface, QueryRunner } from "typeorm";

export class AddServiceSpecialistsAndOrderItemEmployeeId1791900000000 implements MigrationInterface {
    name = 'AddServiceSpecialistsAndOrderItemEmployeeId1791900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "serviceSpecialists" jsonb`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "employeeId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_item" DROP COLUMN IF EXISTS "employeeId"`);
        await queryRunner.query(`ALTER TABLE "reservation" DROP COLUMN IF EXISTS "serviceSpecialists"`);
    }
}
