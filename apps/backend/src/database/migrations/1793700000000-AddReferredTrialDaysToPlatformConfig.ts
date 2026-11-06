import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferredTrialDaysToPlatformConfig1793700000000 implements MigrationInterface {
  name = 'AddReferredTrialDaysToPlatformConfig1793700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_config" ADD COLUMN IF NOT EXISTS "referred_trial_days" integer NOT NULL DEFAULT 15;
      ALTER TABLE "platform_config" ALTER COLUMN "default_trial_days" SET DEFAULT 7;
      UPDATE "platform_config" SET "default_trial_days" = 7 WHERE "id" = 'default' AND "default_trial_days" = 15;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_config" DROP COLUMN IF EXISTS "referred_trial_days";
      ALTER TABLE "platform_config" ALTER COLUMN "default_trial_days" SET DEFAULT 15;
    `);
  }
}
