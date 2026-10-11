import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReservationDurationAndRescheduleColumns1791753200000 implements MigrationInterface {
    name = 'AddReservationDurationAndRescheduleColumns1791753200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "durationMinutes" integer DEFAULT 30`);
        await queryRunner.query(`ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "rescheduleReason" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservation" DROP COLUMN IF EXISTS "rescheduleReason"`);
        await queryRunner.query(`ALTER TABLE "reservation" DROP COLUMN IF EXISTS "durationMinutes"`);
    }
}
