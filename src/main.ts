import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppLogger } from './shared/logger/app-logger.service';
import { assignCleanOperationIds } from './shared/swagger/operation-id';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLogger);
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>('app.nodeEnv') ?? 'development';
  const isDevelopment = nodeEnv !== 'production';
  app.useLogger(logger);

  app.setGlobalPrefix('api');
  app.use(
    helmet({
      contentSecurityPolicy: isDevelopment
        ? {
            directives: {
              'upgrade-insecure-requests': null,
            },
          }
        : undefined,
      hsts: isDevelopment ? false : undefined,
    }),
  );
  app.enableCors({
    origin: isDevelopment
      ? [
          /^http:\/\/localhost(:\d+)?$/,
          /^http:\/\/127\.0\.0\.1(:\d+)?$/,
          /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
          /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/,
          /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
        ]
      : [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const appName = config.get<string>('app.name') ?? 'ZENDA API';

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(appName)
      .setDescription('ZENDA backend API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build(),
  );
  assignCleanOperationIds(document);
  SwaggerModule.setup('api/docs', app, document);

  // Azure App Service (Windows/iisnode) injects PORT as a named pipe string
  // (e.g. \\.\pipe\...), not a number. Pass it through untouched; fall back to
  // the configured numeric port for local runs where PORT is unset.
  const port = process.env.PORT ?? config.get<number>('app.port') ?? 3000;
  await app.listen(port);
  logger.log(`Application running on ${port}`, 'Bootstrap');
}

void bootstrap();
