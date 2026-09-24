import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucket: string = 'storage'; // We can use the default or configurable bucket

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
   * Submits a file buffer directly to S3 storage bucket.
   * Supabase expects the bucket name as part of the S3 URL configuration or as bucket parameter.
   */
  async uploadFile(file: Express.Multer.File, path: string = 'images'): Promise<string> {
    try {
      const fileName = `${path}/${uuidv4()}-${file.originalname}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucket, // Supabase storage bucket name. E.g., 'images' or 'public'
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
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
