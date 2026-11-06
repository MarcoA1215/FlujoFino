import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegisterAppUpdateV1121793600000000 implements MigrationInterface {
  name = 'RegisterAppUpdateV1121793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Limpiar suscripciones push duplicadas en base de datos para evitar notificaciones repetidas
    await queryRunner.query(`
      DELETE FROM "push_subscriptions" a
      USING "push_subscriptions" b
      WHERE a.id < b.id AND a.endpoint = b.endpoint;
    `);

    // 2. Registrar versión v1.1.2 en app_updates
    const changes = JSON.stringify([
      {
        type: 'FIXED',
        text: 'Corrección integral en el motor de notificaciones push FCM: deduplicación estricta de tokens para evitar alertas repetidas.',
      },
      {
        type: 'FIXED',
        text: 'Solicitud obligatoria y garantizada del cuadro de diálogo de permisos de notificaciones en Android.',
      },
      {
        type: 'IMPLEMENTED',
        text: 'Mecanismo anti-concurrencia en la sincronización nativa de tokens push entre el dispositivo y el servidor.',
      },
      {
        type: 'ADDED',
        text: 'Compatibilidad certificada con Google Play Store para Android 13 y versiones superiores (POST_NOTIFICATIONS).',
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
        'Optimización FCM, Anti-duplicados y Permisos Android',
        'v1.1.2',
        13,
        'https://www.finowork.com/FinoWork.apk',
        false,
        3,
        '24.7',
        'Corrección del despacho múltiple de notificaciones push, deduplicación de tokens en base de datos y activación garantizada del permiso de notificaciones en Android.',
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
      DELETE FROM "app_updates" WHERE "versionCode" = 13;
    `);
  }
}
