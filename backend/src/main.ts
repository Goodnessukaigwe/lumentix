import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { corsOptions, helmetOptions } from './common/security/security.config';
import { RateLimitGuard } from './common/security/rate-limit.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security middleware ────────────────────────────────────────────────────
  app.use(helmet(helmetOptions));
  app.enableCors(corsOptions);

  // ── Global guards & pipes ─────────────────────────────────────────────────
  app.useGlobalGuards(new RateLimitGuard(100, 60_000)); // 100 req / IP / min

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true, // harden: reject unknown fields (was false)
    }),
  );

  // ── Swagger ───────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
