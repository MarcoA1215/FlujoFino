import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
const sharp = require('sharp');

@Injectable()
export class StorageService {
  private s3Client: S3Client | null = null;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET') || '';
    const endpoint = this.configService.get<string>('S3_ENDPOINT') || '';
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY') || '';
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';

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
    }
  }

  private validateConfig(): void {
    const missing: string[] = [];
    if (!this.configService.get<string>('S3_ENDPOINT')) missing.push('S3_ENDPOINT');
    if (!this.bucket) missing.push('S3_BUCKET');
    if (!this.configService.get<string>('S3_ACCESS_KEY_ID')) missing.push('S3_ACCESS_KEY_ID');
    if (!this.configService.get<string>('S3_SECRET_ACCESS_KEY')) missing.push('S3_SECRET_ACCESS_KEY');

    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Configuración de almacenamiento S3 incompleta. Faltan variables de entorno requeridas: ${missing.join(', ')}`
      );
    }
  }

  async uploadFile(file: Express.Multer.File, path: string = 'images'): Promise<string> {
    this.validateConfig();

    try {
      const isImage = file.mimetype.startsWith('image/');
      let fileBuffer = file.buffer;
      let contentType = file.mimetype;
      let extension = file.originalname.split('.').pop() || 'jpg';

      if (isImage) {
        fileBuffer = await sharp(file.buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        
        contentType = 'image/webp';
        extension = 'webp';
      }

      const fileName = `${path}/${randomUUID()}.${extension}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await this.s3Client!.send(command);

      const endpoint = this.configService.get<string>('S3_ENDPOINT') || '';
      const customPublicUrl = this.configService.get<string>('S3_PUBLIC_URL');
      
      if (customPublicUrl) {
        const cleanBase = customPublicUrl.replace(/\/$/, '');
        if (cleanBase.includes('r2.dev') || cleanBase.endsWith(`/${this.bucket}`) || cleanBase.endsWith(this.bucket)) {
          return `${cleanBase}/${fileName}`;
        }
        return `${cleanBase}/${this.bucket}/${fileName}`;
      }

      if (endpoint.includes('storage.supabase.co')) {
        const supabaseHost = endpoint.replace('/storage/v1/s3', '');
        return `${supabaseHost}/storage/v1/object/public/${this.bucket}/${fileName}`;
      }

      if (endpoint.includes('r2.cloudflarestorage.com')) {
        console.warn(
          '⚠️ ADVERTENCIA: Se subió un archivo a Cloudflare R2 pero S3_PUBLIC_URL no está configurada en .env. El endpoint privado de R2 no es accesible públicamente sin autenticación S3.'
        );
      }

      return `${endpoint.replace(/\/$/, '')}/${this.bucket}/${fileName}`;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      console.error('Error uploading file to storage:', error);
      throw new InternalServerErrorException('Error al subir el archivo al almacenamiento S3: ' + (error.message || ''));
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

