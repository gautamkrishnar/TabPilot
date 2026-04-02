import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SocketIoAdapter } from './adapters/socket-io.adapter';
import { AppModule } from './app.module';

// TLS — enable HTTPS by setting TLS_CERT and TLS_KEY env vars to cert/key file paths.
// On OpenShift, these are typically populated from a service-serving-cert secret.
const TLS_CERT = process.env.TLS_CERT ?? '';
const TLS_KEY = process.env.TLS_KEY ?? '';
const hasTLS = !!TLS_CERT && !!TLS_KEY && existsSync(TLS_CERT) && existsSync(TLS_KEY);
const HTTPS_PORT = process.env.HTTPS_PORT ? parseInt(process.env.HTTPS_PORT, 10) : 8443;

async function bootstrap() {
  // When OpenShift service-serving certs are present, serve HTTPS on port 8443
  // so the Route can use `reencrypt` TLS termination. This enables WebSocket
  // connections to pass through HAProxy without being blocked by the WAF.
  // Falls back to plain HTTP on port 3000 for local development.
  const fastifyOptions = hasTLS
    ? { https: { key: readFileSync(TLS_KEY), cert: readFileSync(TLS_CERT) } }
    : { logger: false };

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(fastifyOptions),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.useWebSocketAdapter(new SocketIoAdapter(app));
  app.setGlobalPrefix('api');

  // ── Swagger / OpenAPI ──────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tab Pilot API')
    .setDescription(
      'REST API for Tab Pilot — real-time grooming and tab synchronization. ' +
        'Real-time collaboration is handled over WebSocket (Socket.IO) using the events defined in @tabpilot/shared.',
    )
    .setVersion('1.0')
    .addTag(
      'sessions',
      'Session lifecycle — create, query, join as participant, and join as co-host',
    )
    .addTag('health', 'Health check endpoint')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Available at /api-docs (excluded from /api prefix)
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Tab Pilot API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
    },
  });

  // Serve the React SPA in production (web/dist is placed alongside api/dist)
  const webDistPath = join(__dirname, '..', '..', 'web', 'dist');
  if (process.env.NODE_ENV === 'production' && existsSync(webDistPath)) {
    // @fastify/static has no ESM-compatible default export; require is intentional
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    await app.register(require('@fastify/static'), {
      root: webDistPath,
      prefix: '/',
      wildcard: false,
    });

    // SPA fallback — intercept 404s for non-API routes and serve index.html.
    // We use onSend instead of setNotFoundHandler because NestJS registers its
    // own NotFoundHandler during app.init() and Fastify rejects a second one.
    const indexHtml = readFileSync(join(webDistPath, 'index.html'), 'utf-8');
    const instance = app.getHttpAdapter().getInstance() as unknown as {
      addHook: (event: string, fn: (...args: unknown[]) => void) => void;
    };
    instance.addHook('onSend', (req: any, reply: any, payload: any, done: any) => {
      if (reply.statusCode === 404 && !req.url.startsWith('/api')) {
        reply.code(200).type('text/html');
        return done(null, indexHtml);
      }
      done(null, payload);
    });
  }

  const port = hasTLS ? HTTPS_PORT : process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
