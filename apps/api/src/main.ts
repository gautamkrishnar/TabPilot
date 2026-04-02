import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SocketIoAdapter } from './adapters/socket-io.adapter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
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
        'WebSocket events are documented in docs/DEVELOPMENT.md.',
    )
    .setVersion('1.0')
    .addTag('sessions', 'Session lifecycle — create, query, and join grooming sessions')
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

    // SPA fallback — all non-API routes serve index.html.
    // @fastify/static augments the reply with sendFile at runtime, which the
    // base FastifyInstance types don't know about, so the cast via unknown is necessary.
    const instance = app.getHttpAdapter().getInstance() as unknown as {
      setNotFoundHandler: (
        fn: (req: unknown, reply: { sendFile: (f: string) => void }) => void,
      ) => void;
    };
    instance.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html');
    });
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
