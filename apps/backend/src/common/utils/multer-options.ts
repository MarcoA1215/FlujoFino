import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const safeImageUploadOptions: MulterOptions = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif|pdf)$/i)) {
      return cb(
        new BadRequestException('Formato de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WebP) o documentos PDF.'),
        false,
      );
    }
    cb(null, true);
  },
};
