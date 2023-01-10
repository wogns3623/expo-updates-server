import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModuleOptions, MulterOptionsFactory } from '@nestjs/platform-express';
import { Request } from 'express';
import { createWriteStream } from 'fs';
import fs from 'fs/promises';
import { DiskStorageOptions, StorageEngine } from 'multer';
import path from 'path';
import { bundleNameRegex } from '../expo.update.types';

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createMulterOptions(): MulterModuleOptions {
    const dest = path.resolve(this.config.get('FILE_LOCAL_STORAGE_PATH'), 'assets');

    const filenameFn = async (req: Request, file: Express.Multer.File) => {
      const filename = file.originalname;
      const matchResult = filename.match(bundleNameRegex);
      if (!matchResult) return filename;

      const [, , uuid] = matchResult;

      return uuid;
    };

    const destinationFn = async (req: Request, file: Express.Multer.File) => dest;

    return {
      storage: new CustomDiskStorage({
        destination: destinationFn,
        filename: filenameFn,
        fileFilter: async (req: Request, file: Express.Multer.File) => {
          // check file with same name exist
          const notExist = await fs
            .access(path.join(file.path), fs.constants.F_OK | fs.constants.R_OK)
            .then(() => null)
            .catch(async e => e);

          file.accepted = !!notExist;

          if (!file.accepted) throw new Error('File already exist');

          if (!req.acceptedFiles) req.acceptedFiles = [];
          req.acceptedFiles.push(file);
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
type FileFilter = (req: Request, file: Express.Multer.File) => void | Promise<void>;

export class CustomDiskStorage implements StorageEngine {
  private getDestination: GetFileDestination;
  private getFilename: GetFilename;
  private fileFilter: FileFilter;

  constructor(
    private readonly options: Omit<DiskStorageOptions, 'destination' | 'filename'> & {
      destination: GetFileDestination;
      filename: GetFilename;
      fileFilter?: FileFilter;
    },
  ) {
    this.getDestination = options.destination;
    this.getFilename = options.filename;
    this.fileFilter = options.fileFilter ?? (() => {});
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

      const fileExtended = {
        destination,
        filename,
        path: finalPath,
      };

      file.destination = fileExtended.destination;
      file.filename = fileExtended.filename;
      file.path = fileExtended.path;

      file.stream.on('data', (chunk: any) => {
        if (!file.buffer) file.buffer = Buffer.from(chunk);
        else file.buffer = Buffer.concat([file.buffer, chunk]);
      });

      const accepted = await Promise.resolve(this.fileFilter(req, file))
        .then(() => true)
        .catch(e => {
          file.rejectReason = e;
          return false;
        });
      if (!accepted) return callback(null, fileExtended);

      const outStream = createWriteStream(finalPath);
      outStream.on('error', callback);
      outStream.on('finish', function () {
        return callback(null, {
          ...fileExtended,
          size: outStream.bytesWritten,
        });
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

      await fs.unlink(path);
      return callback(null);
    } catch (error) {
      return callback(error);
    }
  }
}
