import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApkAndGraceDaysToAppUpdates1793100000000 implements MigrationInterface {
  name = 'AddApkAndGraceDaysToAppUpdates1793100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_updates"
      ADD COLUMN IF NOT EXISTS "versionCode" integer,
      ADD COLUMN IF NOT EXISTS "apkUrl" character varying(500),
      ADD COLUMN IF NOT EXISTS "mandatory" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "graceDays" integer NOT NULL DEFAULT 3,
      ADD COLUMN IF NOT EXISTS "fileSizeMb" character varying(50);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_updates"
      DROP COLUMN IF EXISTS "versionCode",
      DROP COLUMN IF EXISTS "apkUrl",
      DROP COLUMN IF EXISTS "mandatory",
      DROP COLUMN IF EXISTS "graceDays",
      DROP COLUMN IF EXISTS "fileSizeMb";
    `);
  }
}
