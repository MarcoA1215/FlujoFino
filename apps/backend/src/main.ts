import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

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
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  // Strict CORS Configuration
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://flujofino.onrender.com',
    'https://finowork.onrender.com',
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