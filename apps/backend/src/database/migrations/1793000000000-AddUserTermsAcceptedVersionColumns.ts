import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTermsAcceptedVersionColumns1793000000000 implements MigrationInterface {
  name = 'AddUserTermsAcceptedVersionColumns1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_version" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privacy_accepted_version" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "promoters" ADD COLUMN IF NOT EXISTS "terms_accepted_version" varchar(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promoters" DROP COLUMN IF EXISTS "terms_accepted_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "privacy_accepted_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_accepted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_accepted_version"`,
    );
  }
}
