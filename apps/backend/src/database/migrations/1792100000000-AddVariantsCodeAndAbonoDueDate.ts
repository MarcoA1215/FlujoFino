import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVariantsCodeAndAbonoDueDate1792100000000 implements MigrationInterface {
    name = 'AddVariantsCodeAndAbonoDueDate1792100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "code" character varying`);
        await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "hasVariants" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "nextAbonoDueDate" timestamp`);
        await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "abonoDefaultDueDays" integer DEFAULT 7`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "variantId" character varying`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "variantName" character varying`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "product_variant" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "productId" uuid NOT NULL,
                "tenantId" character varying,
                "name" character varying NOT NULL,
                "sku" character varying,
                "attributes" jsonb,
                "stockQuantity" numeric(12,4) NOT NULL DEFAULT 0,
                "cost" numeric(12,2),
                "salePrice" numeric(12,2),
                "images" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_product_variant" PRIMARY KEY ("id"),
                CONSTRAINT "FK_product_variant_product" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_product_variant_product" ON "product_variant" ("productId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_product_variant_tenant" ON "product_variant" ("tenantId", "productId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_product_code" ON "product" ("code")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_code"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_variant_tenant"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_variant_product"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "product_variant"`);
        await queryRunner.query(`ALTER TABLE "order_item" DROP COLUMN IF EXISTS "variantName"`);
        await queryRunner.query(`ALTER TABLE "order_item" DROP COLUMN IF EXISTS "variantId"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN IF EXISTS "abonoDefaultDueDays"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "nextAbonoDueDate"`);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "hasVariants"`);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "code"`);
    }
}
