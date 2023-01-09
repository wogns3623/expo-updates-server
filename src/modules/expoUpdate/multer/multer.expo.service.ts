import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModuleOptions, MulterOptionsFactory } from '@nestjs/platform-express';
import { Request } from 'express';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import { DiskStorageOptions, StorageEngine } from 'multer';
import path from 'path';
import { bundleNameRegex } from '../expo.update.types';

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createMulterOptions(): MulterModuleOptions {
    const dest = path.resolve(this.config.get('FILE_LOCAL_STORAGE_PATH'), 'assets');

    return {
      storage: new CustomDiskStorage({
        destination: async (req, file) => dest,
        filename: async (req, file) => {
          const filename = file.originalname;
          const matchResult = filename.match(bundleNameRegex);
          if (!matchResult) return filename;

          const [, , uuid] = matchResult;
          return uuid;
        },
      }),
      limits: {
        fieldNameSize: 10 * 1024, // 10kb
      },
    };
  }
}

type GetFileDestination = (req: Request, file: Express.Multer.File) => string | Promise<string>;
type GetFilename = (req: Request, file: Express.Multer.File) => string | Promise<string>;

export class CustomDiskStorage implements StorageEngine {
  private getDestination: GetFileDestination;
  private getFilename: GetFilename;

  constructor(
    private readonly options: Omit<DiskStorageOptions, 'destination' | 'filename'> & {
      destination: GetFileDestination;
      filename: GetFilename;
    },
  ) {
    this.getDestination = options.destination;
    this.getFilename = options.filename;
  }

  async _handleFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error?: any, info?: Partial<Express.Multer.File> | undefined) => void,
  ): Promise<void> {
    try {
      const destination = await this.getDestination(req, file);
      const filename = await this.getFilename(req, file);

      const finalPath = path.join(destination, filename);
      const outStream = createWriteStream(finalPath);
      outStream.on('error', callback);
      outStream.on('finish', function () {
        return callback(null, {
          destination: destination,
          filename: filename,
          path: finalPath,
          size: outStream.bytesWritten,
        });
      });

      file.stream.on('data', (chunk: any) => {
        if (!file.buffer) file.buffer = Buffer.from(chunk);
        else file.buffer = Buffer.concat([file.buffer, chunk]);
      });

      file.stream.pipe(outStream);
    } catch (error) {
      return callback(error);
    }
  }

  async _removeFile(
    req: Request,
    file: Partial<Express.Multer.File>,
    callback: (error: Error | null) => void,
  ): Promise<void> {
    try {
      const path = file.path as string;

      delete file.destination;
      delete file.filename;
      delete file.path;

      await unlink(path);
      return callback(null);
    } catch (error) {
      return callback(error);
    }
  }
}
