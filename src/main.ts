import AppModule from '@module/app';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import fs from 'fs/promises';
import path from 'path';

process.on('uncaughtException', (error, origin) => {
  console.error('Unhandled Rejection at:', origin, 'error:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config: ConfigService = app.get(ConfigService);
  const NODE_ENV = config.get('NODE_ENV');

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true, exposeDefaultValues: true },
      enableDebugMessages: NODE_ENV !== 'production',
      whitelist: true,
    }),
  );

  const assetStoragePath = path.resolve(config.get('FILE_LOCAL_STORAGE_PATH'), 'assets');
  try {
    await fs.access(assetStoragePath, fs.constants.F_OK | fs.constants.W_OK | fs.constants.R_OK);
  } catch (e) {
    throw new Error(`Directory ${assetStoragePath} not exist`);
  }

  await app.listen(3000);
}
bootstrap();
