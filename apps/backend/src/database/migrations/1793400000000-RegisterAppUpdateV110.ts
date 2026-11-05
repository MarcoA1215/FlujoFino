import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegisterAppUpdateV1101793400000000 implements MigrationInterface {
  name = 'RegisterAppUpdateV1101793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const changes = JSON.stringify([
      {
        type: 'ADDED',
        text: 'Notificaciones push nativas en segundo plano mediante Firebase Cloud Messaging (FCM).',
      },
      {
        type: 'ADDED',
        text: 'Canal de notificaciones prioritarias con sonido y vibración para pedidos y reservas.',
      },
      {
        type: 'IMPLEMENTED',
        text: 'Permisos nativos de red (ACCESS_NETWORK_STATE), vibración y activación en segundo plano (WAKE_LOCK).',
      },
      {
        type: 'FIXED',
        text: 'Compatibilidad híbrida para despacho simultáneo a dispositivos Web y APK móvil.',
      },
    ]);

    await queryRunner.query(`
      INSERT INTO "app_updates" (
        "id",
        "title",
        "version",
        "versionCode",
        "apkUrl",
        "mandatory",
        "graceDays",
        "fileSizeMb",
        "summary",
        "changes",
        "isPublished",
        "publishedAt",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        'Notificaciones Push Nativas FCM y Permisos Mejorados',
        'v1.1.0',
        11,
        'https://www.finowork.com/FinoWork.apk',
        false,
        3,
        '25.8',
        'Integración nativa con Firebase Cloud Messaging (FCM) para recibir alertas inmediatas de nuevos pedidos y reservas con sonido y vibración, incluso con la app cerrada.',
        '${changes.replace(/'/g, "''")}'::jsonb,
        true,
        NOW(),
        NOW(),
        NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "app_updates" WHERE "versionCode" = 11;
    `);
  }
}
