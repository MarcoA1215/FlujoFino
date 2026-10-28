import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppUpdatesTable1792400000000 implements MigrationInterface {
  name = 'CreateAppUpdatesTable1792400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_updates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "version" character varying(50),
        "summary" text,
        "changes" jsonb NOT NULL DEFAULT '[]',
        "isPublished" boolean NOT NULL DEFAULT true,
        "publishedAt" timestamp,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_updates_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "app_updates"`);
  }
}
