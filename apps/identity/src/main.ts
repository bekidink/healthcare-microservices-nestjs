import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Identity',
    description:
      'Users, credentials, sessions, roles/permissions, memberships and provider credentials. ' +
      'Owns identity_db. Internal /internal/* routes are for gateway-to-service calls only, never exposed publicly.',
    // Single flat path segment, not the 'docs' default: nestjs/swagger embeds
    // asset hrefs as `./{path}/{asset}`, which only resolves correctly when
    // this exact segment is also the last segment of whatever public URL
    // reaches this page — here that's the gateway's proxied /docs/identity
    // (see apps/gateway/src/proxy/proxy.setup.ts).
    path: 'identity',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[identity] listening on :${port} (docs at /identity)`);
}

bootstrap();
