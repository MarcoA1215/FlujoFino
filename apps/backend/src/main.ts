import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { types } from 'pg';

// Forzar a node-postgres a interpretar TIMESTAMP sin zona horaria (OID 1114) en UTC
// evitando desplazamientos incorrectos por la zona horaria del servidor o máquina local
types.setTypeParser(1114, (stringValue: string) => {
  return stringValue ? new Date(stringValue.replace(' ', 'T') + 'Z') : null;
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers: Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      xFrameOptions: { action: 'sameorigin' },
      contentSecurityPolicy: false,
    }),
  );

  // Disable Express signature
  const httpAdapter = app.getHttpAdapter().getInstance();
  if (httpAdapter && typeof httpAdapter.disable === 'function') {
    httpAdapter.disable('x-powered-by');
  }

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Validation & Sanitization Pipe (Production hardened)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Strict CORS Configuration
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://flujofino.onrender.com',
    'https://finowork.onrender.com',
    'https://finowork.com',
    'https://www.finowork.com',
    'https://finowork.vercel.app',
    'https://flujofino.vercel.app',
    'capacitor://localhost',
    'https://localhost',   
    'ionic://localhost',    
    'http://localhost',       
  ];

  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  if (process.env.FRONTEND_URL_APK) {
    allowedOrigins.push(process.env.FRONTEND_URL_APK);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile, server-to-server, curl) or matching origins
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.finowork.com') ||
        origin === 'https://finowork.com' ||
        /^https:\/\/([a-z0-9-]+-)?(finowork|flujofino).*\.vercel\.app$/.test(origin) ||
        /^https:\/\/([a-z0-9-]+-)?(finowork|flujofino).*\.onrender\.com$/.test(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin) ||
        (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) ||
        (process.env.FRONTEND_URL_APK && origin === process.env.FRONTEND_URL_APK)
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();