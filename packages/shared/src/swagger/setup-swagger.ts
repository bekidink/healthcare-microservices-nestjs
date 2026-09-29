import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Common Swagger/OpenAPI bootstrap every service calls from its own
 * main.ts, so the docs page looks and behaves the same everywhere (title
 * format, bearer-auth scheme, docs path) rather than each service
 * reinventing DocumentBuilder config.
 */
export function setupSwagger(app: INestApplication, params: { serviceName: string; description: string; path?: string }) {
  const config = new DocumentBuilder()
    .setTitle(`${params.serviceName} API`)
    .setDescription(params.description)
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(params.path ?? 'docs', app, document);
}
