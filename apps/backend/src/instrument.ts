import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Tracing
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE) : 0.1,
    // Profiling (10% en producción para evitar agotamiento de RAM en contenedores de 512MB)
    profileSessionSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE ? Number(process.env.SENTRY_PROFILES_SAMPLE_RATE) : 0.1,
    profileLifecycle: 'trace',
  });
}
