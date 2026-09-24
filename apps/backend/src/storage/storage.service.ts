import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucket: string = 'img_catalogo'; // We can use the default or configurable bucket

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      forcePathStyle: true,
      endpoint: 'https://sobczifocynyrcwfhezm.storage.supabase.co/storage/v1/s3',
      region: 'us-east-1',
      credentials: {
        accessKeyId: '1b34b5201d13724da287738a033a9ef3',
        secretAccessKey: '509e18be1df9548cb4fcf39cc2ca2d89342cec44553420961be0dfff3e3127a2',
      },
    });
  }

  /**
   * Submits a file buffer directly to S3 storage bucket, compressing it if it's an image.
   * Supabase expects the bucket name as part of the S3 URL configuration or as bucket parameter.
   */
  async uploadFile(file: Express.Multer.File, path: string = 'images'): Promise<string> {
    try {
      const isImage = file.mimetype.startsWith('image/');
      let fileBuffer = file.buffer;
      let contentType = file.mimetype;
      let extension = file.originalname.split('.').pop() || 'jpg';

      if (isImage) {
        // Compress the image using sharp
        fileBuffer = await sharp(file.buffer)
          .resize({ width: 1200, withoutEnlargement: true }) // Max width 1200px
          .webp({ quality: 80 }) // Convert to WebP with 80% quality
          .toBuffer();
        
        contentType = 'image/webp';
        extension = 'webp';
      }

      const fileName = `${path}/${uuidv4()}.${extension}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucket, // Supabase storage bucket name. E.g., 'img_catalogo'
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      // Return the public URL or relative path based on whether the bucket is public
      // Since it's supabase, standard public url format:
      return `https://sobczifocynyrcwfhezm.supabase.co/storage/v1/object/public/${this.bucket}/${fileName}`;
    } catch (error) {
      console.error('Error uploading file to storage:', error);
      throw new InternalServerErrorException('Could not upload file');
    }
  }

  async deleteFile(url: string): Promise<void> {
    try {
      // Extract key from the URL
      const keyIndex = url.indexOf(`/object/public/${this.bucket}/`);
      if (keyIndex === -1) return; // Not a valid supabase url for this bucket

      const key = url.substring(keyIndex + `/object/public/${this.bucket}/`.length);

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

