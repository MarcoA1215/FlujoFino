import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
const sharp = require('sharp');

@Injectable()
export class StorageService {
  private s3Client: S3Client | null = null;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.bucket = (this.configService.get<string>('S3_BUCKET') || '').trim();
    const endpoint = (this.configService.get<string>('S3_ENDPOINT') || '').trim();
    const accessKeyId = (this.configService.get<string>('S3_ACCESS_KEY_ID') || '').trim();
    const secretAccessKey = (this.configService.get<string>('S3_SECRET_ACCESS_KEY') || '').trim();
    const region = (this.configService.get<string>('S3_REGION') || 'us-east-1').trim();

    console.log('[StorageService] 🛠️ Inicializando cliente S3:');
    console.log(' - S3_BUCKET:', this.bucket ? `"${this.bucket}"` : '(NO DEFINIDO)');
    console.log(' - S3_ENDPOINT:', endpoint ? `"${endpoint}"` : '(NO DEFINIDO)');
    console.log(' - S3_REGION:', `"${region}"`);
    console.log(' - S3_ACCESS_KEY_ID:', accessKeyId ? `"${accessKeyId.slice(0, 4)}...${accessKeyId.slice(-4)}" (Longitud: ${accessKeyId.length})` : '(NO DEFINIDO)');
    console.log(' - S3_SECRET_ACCESS_KEY:', secretAccessKey ? `Configurado (Longitud: ${secretAccessKey.length})` : '(NO DEFINIDO)');

    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        forcePathStyle: true,
        endpoint,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      console.log('[StorageService] ✅ S3Client instanciado correctamente con forcePathStyle: true.');
    } else {
      console.warn('[StorageService] ⚠️ S3Client NO fue inicializado por credenciales o endpoint faltantes.');
    }
  }

  private validateConfig(): void {
    const missing: string[] = [];
    if (!this.configService.get<string>('S3_ENDPOINT')) missing.push('S3_ENDPOINT');
    if (!this.bucket) missing.push('S3_BUCKET');
    if (!this.configService.get<string>('S3_ACCESS_KEY_ID')) missing.push('S3_ACCESS_KEY_ID');
    if (!this.configService.get<string>('S3_SECRET_ACCESS_KEY')) missing.push('S3_SECRET_ACCESS_KEY');

    if (missing.length > 0) {
      console.error('[StorageService.validateConfig] ❌ Faltan variables requeridas:', missing);
      throw new InternalServerErrorException(
        `Configuración de almacenamiento S3 incompleta. Faltan variables de entorno requeridas: ${missing.join(', ')}`
      );
    }
  }

  async uploadFile(file: Express.Multer.File, path: string = 'images'): Promise<string> {
    this.validateConfig();

    const fileSizeKB = file.buffer ? (file.buffer.length / 1024).toFixed(1) : '0';
    console.log(`[StorageService.uploadFile] 📤 Iniciando subida de archivo "${file.originalname}" (${file.mimetype}, ${fileSizeKB} KB) hacia bucket "${this.bucket}" en ruta "${path}"`);

    try {
      const isImage = file.mimetype.startsWith('image/');
      let fileBuffer = file.buffer;
      let contentType = file.mimetype;
      let extension = file.originalname.split('.').pop() || 'jpg';

      if (isImage) {
        console.log('[StorageService.uploadFile] 🖼️ Optimizando imagen con Sharp a WebP...');
        fileBuffer = await sharp(file.buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        
        contentType = 'image/webp';
        extension = 'webp';
        console.log(`[StorageService.uploadFile] ✨ Imagen optimizada: ${(fileBuffer.length / 1024).toFixed(1)} KB WebP`);
      }

      const fileName = `${path}/${randomUUID()}.${extension}`;
      
      console.log(`[StorageService.uploadFile] 🚀 Enviando PutObjectCommand a S3: Bucket="${this.bucket}", Key="${fileName}"`);
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await this.s3Client!.send(command);
      console.log('[StorageService.uploadFile] 🎉 PutObjectCommand completado exitosamente.');

      const endpoint = this.configService.get<string>('S3_ENDPOINT') || '';
      const customPublicUrl = this.configService.get<string>('S3_PUBLIC_URL');
      
      let finalUrl = '';
      if (customPublicUrl) {
        const cleanBase = customPublicUrl.replace(/\/$/, '');
        if (cleanBase.includes('r2.dev') || cleanBase.endsWith(`/${this.bucket}`) || cleanBase.endsWith(this.bucket)) {
          finalUrl = `${cleanBase}/${fileName}`;
        } else {
          finalUrl = `${cleanBase}/${this.bucket}/${fileName}`;
        }
      } else if (endpoint.includes('.supabase.co')) {
        const supabaseHost = endpoint.replace('/storage/v1/s3', '');
        finalUrl = `${supabaseHost}/storage/v1/object/public/${this.bucket}/${fileName}`;
      } else if (endpoint.includes('r2.cloudflarestorage.com')) {
        console.warn(
          '⚠️ ADVERTENCIA: Se subió un archivo a Cloudflare R2 pero S3_PUBLIC_URL no está configurada en .env. El endpoint privado de R2 no es accesible públicamente sin autenticación S3.'
        );
        finalUrl = `${endpoint.replace(/\/$/, '')}/${this.bucket}/${fileName}`;
      } else {
        finalUrl = `${endpoint.replace(/\/$/, '')}/${this.bucket}/${fileName}`;
      }

      console.log(`[StorageService.uploadFile] 🔗 URL pública generada: ${finalUrl}`);
      return finalUrl;
    } catch (error: any) {
      if (error instanceof InternalServerErrorException) throw error;
      
      console.error('[StorageService.uploadFile ERROR] 💥 Error al subir archivo a S3:');
      console.error(' - Mensaje de error:', error?.message);
      console.error(' - Nombre de error / Código:', error?.name, error?.Code);
      console.error(' - Código de Estado HTTP:', error?.$metadata?.httpStatusCode);
      console.error(' - RequestId:', error?.$metadata?.requestId);
      console.error(' - Bucket intentado:', `"${this.bucket}"`);
      console.error(' - Endpoint configurado:', `"${this.configService.get<string>('S3_ENDPOINT')}"`);

      // Diagnóstico automático: intentar listar los buckets que realmente ve este cliente S3
      let diagnosticMessage = '';
      if (this.s3Client) {
        try {
          console.log('[StorageService.uploadFile DIAGNÓSTICO] Consultando lista de buckets disponibles con ListBucketsCommand...');
          const listRes = await this.s3Client.send(new ListBucketsCommand({}));
          const existingBuckets = (listRes.Buckets || []).map(b => b.Name).filter(Boolean);
          console.log('[StorageService.uploadFile DIAGNÓSTICO] 📋 Buckets existentes en este servidor:', existingBuckets);
          if (existingBuckets.length === 0) {
            diagnosticMessage = ` (El servidor S3 respondió pero NO tiene ningún bucket creado).`;
          } else {
            diagnosticMessage = ` (Buckets existentes en el servidor: [${existingBuckets.join(', ')}]).`;
          }
        } catch (listErr: any) {
          console.error('[StorageService.uploadFile DIAGNÓSTICO] ❌ No se pudo listar buckets:', listErr.message);
          diagnosticMessage = ` (Fallo al listar buckets: ${listErr.message}).`;
        }
      }

      const userFriendlyMsg = `Error al subir el archivo al almacenamiento S3: ${error.message || 'Error desconocido'}. Bucket configurado: "${this.bucket}"${diagnosticMessage}`;
      throw new InternalServerErrorException(userFriendlyMsg);
    }
  }

  async deleteFile(url: string): Promise<void> {
    try {
      if (!this.bucket || !this.s3Client) return;
      const keyIndex = url.indexOf(`/object/public/${this.bucket}/`);
      let key = '';
      if (keyIndex !== -1) {
        key = url.substring(keyIndex + `/object/public/${this.bucket}/`.length);
      } else {
        const genericIndex = url.indexOf(`/${this.bucket}/`);
        if (genericIndex !== -1) {
          key = url.substring(genericIndex + `/${this.bucket}/`.length);
        }
      }

      if (!key) return;

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
    }
  }
}

