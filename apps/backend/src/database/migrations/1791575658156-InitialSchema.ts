import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1791575658156 implements MigrationInterface {
    name = 'InitialSchema1791575658156'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "cash_exchanges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "amountBs" numeric(14,2) NOT NULL DEFAULT '0', "amountUSD" numeric(12,2) NOT NULL DEFAULT '0', "exchangeRate" numeric(12,4) NOT NULL DEFAULT '0', "operationType" character varying NOT NULL DEFAULT 'BUY_USD', "source" character varying NOT NULL DEFAULT 'BANCO_BS', "destination" character varying NOT NULL DEFAULT 'CASH_USD', "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9b1e327e376eef219f344101cf4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0db104d30980ef097a63e057d0" ON "cash_exchanges"  ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ebc467f9b5ea19d714a7b598e5" ON "cash_exchanges"  ("tenantId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isEmailVerified"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerificationCode"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerificationExpires"`);
        await queryRunner.query(`ALTER TABLE "saas_payment_reports" ADD "months" integer DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "order" ADD "offlineId" character varying`);
        await queryRunner.query(`ALTER TABLE "settings" ADD "allowNegativeStock" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "settings" ADD "bookingMaxAdvanceDays" integer DEFAULT '365'`);
        await queryRunner.query(`ALTER TABLE "settings" ADD "endOfDayOffsetHours" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "settings" ADD "bookingRequireDeposit" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "settings" ADD "bookingDepositPercentage" numeric(5,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "settings" ADD "initialCashUSD" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "settings" ADD "initialBankBs" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "settings" ADD "initialDigitalUSD" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "settings" ALTER COLUMN "bookingRequireService" SET DEFAULT true`);
        await queryRunner.query(`CREATE INDEX "IDX_e810a60fffdf12bdcc8094722c" ON "user_tenant_access"  ("userId", "tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b8eb9f3e420aa846f30e291960" ON "tenant"  ("isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_26e4cd6480e6e3a8fdfa1391e3" ON "tenant"  ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_a2ba056b43aaf2d67bd69f240b" ON "order"  ("offlineId") `);
        await queryRunner.query(`ALTER TABLE "promoter_commissions" ADD CONSTRAINT "FK_307991c43f21dfdce50d755e6d6" FOREIGN KEY ("promoterId") REFERENCES "promoters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promoter_commissions" ADD CONSTRAINT "FK_57ac8ccfdc6ce87f1263f6d6d47" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promoter_commissions" ADD CONSTRAINT "FK_77a77d7908fafb103c0bcf97f7c" FOREIGN KEY ("saasPaymentReportId") REFERENCES "saas_payment_reports"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promoters" ADD CONSTRAINT "FK_e866e887a1e5fba414f2f896b28" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD CONSTRAINT "FK_2663f2514fd6538e3bab84bdbc9" FOREIGN KEY ("promoterId") REFERENCES "promoters"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cash_exchanges" ADD CONSTRAINT "FK_0db104d30980ef097a63e057d00" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order" ADD CONSTRAINT "FK_8cbf856839ddca842f21b804a91" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order" DROP CONSTRAINT "FK_8cbf856839ddca842f21b804a91"`);
        await queryRunner.query(`ALTER TABLE "cash_exchanges" DROP CONSTRAINT "FK_0db104d30980ef097a63e057d00"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP CONSTRAINT "FK_2663f2514fd6538e3bab84bdbc9"`);
        await queryRunner.query(`ALTER TABLE "promoters" DROP CONSTRAINT "FK_e866e887a1e5fba414f2f896b28"`);
        await queryRunner.query(`ALTER TABLE "promoter_commissions" DROP CONSTRAINT "FK_77a77d7908fafb103c0bcf97f7c"`);
        await queryRunner.query(`ALTER TABLE "promoter_commissions" DROP CONSTRAINT "FK_57ac8ccfdc6ce87f1263f6d6d47"`);
        await queryRunner.query(`ALTER TABLE "promoter_commissions" DROP CONSTRAINT "FK_307991c43f21dfdce50d755e6d6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a2ba056b43aaf2d67bd69f240b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_26e4cd6480e6e3a8fdfa1391e3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b8eb9f3e420aa846f30e291960"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e810a60fffdf12bdcc8094722c"`);
        await queryRunner.query(`ALTER TABLE "settings" ALTER COLUMN "bookingRequireService" SET DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "initialDigitalUSD"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "initialBankBs"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "initialCashUSD"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "bookingDepositPercentage"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "bookingRequireDeposit"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "endOfDayOffsetHours"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "bookingMaxAdvanceDays"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "allowNegativeStock"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "offlineId"`);
        await queryRunner.query(`ALTER TABLE "saas_payment_reports" DROP COLUMN "months"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "emailVerificationExpires" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "emailVerificationCode" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "isEmailVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ebc467f9b5ea19d714a7b598e5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0db104d30980ef097a63e057d0"`);
        await queryRunner.query(`DROP TABLE "cash_exchanges"`);
    }

}
