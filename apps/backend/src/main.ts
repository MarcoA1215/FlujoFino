import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

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

  // Global Validation & Sanitization Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
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
    'capacitor://localhost',
    'https://localhost',   
    'ionic://localhost',    
    'http://localhost',       
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile, server-to-server, curl) or matching origins
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.vercel.app') ||
        (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
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