import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromoterTermsAcceptedColumns1792300000000 implements MigrationInterface {
  name = 'AddPromoterTermsAcceptedColumns1792300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promoters" ADD COLUMN IF NOT EXISTS "termsAccepted" boolean DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "promoters" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" timestamp`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promoters" DROP COLUMN IF EXISTS "termsAcceptedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promoters" DROP COLUMN IF EXISTS "termsAccepted"`,
    );
  }
}
