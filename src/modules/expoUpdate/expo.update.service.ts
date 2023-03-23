import { ExpoUpdatesManifest } from '@expo/config';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import fs from 'fs/promises';

import { bundleNameRegex, ExpoPlatform } from './expo.update.types';
import { ExpoModel } from './models';

import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { subtract } from '@util/array';
import { createHash, signRSASHA256 } from '@util/crypto';
import { isArray } from '@util/types';
import { hex2UUID } from '@util/uuid';
import mime from 'mime';
import path from 'path';
import { CreationAttributes } from 'sequelize';
import { Dictionary, serializeDictionary } from 'structured-headers';
import {
  ExpoAssetMetadataDto,
  ExpoMetadataDto,
  ExpoPlatformAssetMetadataDto,
  ManifestRequestDto,
  UploadUpdateBodyDto,
} from './dtos';
import { ExpoAssetType } from './models/expo.asset.model';

@Injectable()
export class ExpoUpdateService {
  constructor(
    private readonly config: ConfigService,

    @InjectModel(ExpoModel.ExpoManifest)
    private readonly ExpoManifest: typeof ExpoModel.ExpoManifest,
    @InjectModel(ExpoModel.ExpoAsset)
    private readonly ExpoAsset: typeof ExpoModel.ExpoAsset,
  ) {}

  async createManifest({
    assets: assetFiles,
    runtimeVersion,
    releaseName,
    metadata,
    expoClient,
  }: UploadUpdateBodyDto & { assets: Express.Multer.File[] }) {
    const manifestDtoList: CreationAttributes<ExpoModel.ExpoManifest>[] = [];
    const commonManifest = {
      uuid: this.getManifestUuid(metadata),
      runtimeVersion,
      releaseName,
      createdAt: new Date().toISOString(),
      metadata: {},
      extra: { expoClient },
    };

    const assetFileMap = new Map(assetFiles.map(f => [f.originalname, f]));

    const errors = [];
    if (metadata.fileMetadata.android) {
      try {
        const existManifest = await ExpoModel.ExpoManifest.findOne({
          where: { uuid: commonManifest.uuid, releaseName, platform: ExpoPlatform.Android },
        });
        if (!existManifest) {
          const [androidBundle, ...androidAssets] = await this.getOrCreateAssets(
            ExpoPlatform.Android,
            metadata.fileMetadata.android,
            assetFileMap,
          );

          manifestDtoList.push({
            ...commonManifest,
            platform: ExpoPlatform.Android,
            ExpoManifest_Assets: androidAssets.map(asset => ({ assetId: asset.id })),
            launchAssetId: androidBundle.id,
          });
        }
      } catch (error) {
        if (isArray(error)) errors.push(...error);
        else errors.push(error);
      }
    }

    if (metadata.fileMetadata.ios) {
      try {
        const existManifest = await ExpoModel.ExpoManifest.findOne({
          where: { uuid: commonManifest.uuid, releaseName, platform: ExpoPlatform.IOS },
        });
        if (!existManifest) {
          const [iosBundle, ...iosAssets] = await this.getOrCreateAssets(
            ExpoPlatform.IOS,
            metadata.fileMetadata.ios,
            assetFileMap,
          );

          manifestDtoList.push({
            ...commonManifest,
            platform: ExpoPlatform.IOS,
            ExpoManifest_Assets: iosAssets.map(asset => ({ assetId: asset.id })),
            launchAssetId: iosBundle.id,
          });
        }
      } catch (error) {
        if (isArray(error)) errors.push(...error);
        else errors.push(error);
      }
    }

    if (errors.length > 0)
      throw new BadRequestException({ message: 'Cannot Create Manifest', detail: { errors } });

    if (manifestDtoList.length > 0)
      await this.ExpoManifest.bulkCreate(manifestDtoList, {
        include: { association: this.ExpoManifest.associations.ExpoManifest_Assets },
      });
  }

  async getManifest({
    runtimeVersion,
    platform,
    releaseName,
  }: ManifestRequestDto & { releaseName: string }): Promise<ExpoUpdatesManifest> {
    const manifest = await this.ExpoManifest.findOne({
      where: { runtimeVersion, releaseName, platform },
      include: [
        { association: this.ExpoManifest.associations.assets },
        { association: this.ExpoManifest.associations.launchAsset, required: true },
      ],
      order: [
        ['createdAt', 'desc'],
        ['id', 'desc'],
      ],
      rejectOnEmpty: new NotFoundException({
        message: `Cannot Find Manifest of runtimeVersion ${runtimeVersion}`,
        detail: { runtimeVersion },
      }),
    });

    if (!manifest.assets || !manifest.launchAsset) {
      throw new NotFoundException({
        message: `Cannot Find Assets of runtimeVersion ${runtimeVersion}`,
        detail: { runtimeVersion },
      });
    }
    const requestUrl = `${this.config.get('HOSTNAME')}/api/update/expo/assets`;

    const updatesManifestAssets = manifest.assets.map(asset => asset.toMetadata(requestUrl));
    const updatesManifestLaunchAsset = manifest.launchAsset.toMetadata(requestUrl);

    const updatesManifest: ExpoUpdatesManifest = {
      id: manifest.uuid,
      createdAt: manifest.createdAt.toISOString(),
      runtimeVersion: manifest.runtimeVersion,
      launchAsset: updatesManifestLaunchAsset,
      assets: updatesManifestAssets,
      metadata: manifest.metadata,
      extra: manifest.extra,
    };

    return updatesManifest;
  }

  async getAsset(assetUuid: string): Promise<ExpoModel.ExpoAsset> {
    const asset = await this.ExpoAsset.findOne({
      where: { uuid: assetUuid },
      rejectOnEmpty: new NotFoundException({
        message: `Cannot Find Asset of uuid ${assetUuid}`,
        detail: { assetUuid },
      }),
    });

    return asset;
  }

  async getSignature(manifest: ExpoUpdatesManifest) {
    const privateKey = await this.getPrivateKey();

    if (!privateKey)
      throw new BadRequestException(
        'Code signing requested but no key supplied when starting server.',
      );

    const manifestString = JSON.stringify(manifest);
    const hashSignature = signRSASHA256(manifestString, privateKey);

    const dictionary = this.convertToDictionaryItemsRepresentation({
      sig: hashSignature,
      keyid: 'main',
    });

    return serializeDictionary(dictionary);
  }

  async getAssetRequestHeaders(manifest: ExpoUpdatesManifest) {
    return null;

    // const assetRequestHeaders: ExpoAssetHeader = {};

    // // [...manifest.assets, manifest.launchAsset].forEach(asset => {
    // //   assetRequestHeaders[asset.key] = {
    // //     'test-header': 'test-header-value',
    // //   };
    // // });

    // return assetRequestHeaders;
  }

  private getManifestUuid(metadata: ExpoMetadataDto) {
    const updateMetadataBuffer = Buffer.from(JSON.stringify(metadata));
    return hex2UUID(createHash(updateMetadataBuffer, 'sha256', 'hex'));
  }

  private async getOrCreateAssets(
    platform: ExpoPlatform,
    assetMetadata: ExpoPlatformAssetMetadataDto,
    fileMap: Map<string, Express.Multer.File>,
  ) {
    const assetDtoList: CreationAttributes<ExpoModel.ExpoAsset>[] = [];
    const errors: any[] = [];

    try {
      assetDtoList.push(this.getBundleCreateDto(platform, assetMetadata.bundle, fileMap));
    } catch (e) {
      errors.push(e);
    }
    assetMetadata.assets.forEach(asset => {
      try {
        assetDtoList.push(this.getAssetCreateDto(platform, asset, fileMap));
      } catch (e) {
        errors.push(e);
      }
    });

    if (errors.length > 0) throw errors;

    const existAssets = await this.ExpoAsset.findAll({
      where: { uuid: assetDtoList.map(({ uuid }) => uuid) },
    });
    const notExistAssets = subtract(
      assetDtoList,
      existAssets.map(({ uuid }) => uuid),
      d => d.uuid,
    );

    const createdAssets = await this.ExpoAsset.bulkCreate(notExistAssets);
    const createdAssetMap = new Map(createdAssets.map(asset => [asset.uuid, asset]));
    const existAssetMap = new Map(existAssets.map(asset => [asset.uuid, asset]));

    return assetDtoList.map(asset => {
      if (createdAssetMap.has(asset.uuid)) return createdAssetMap.get(asset.uuid);
      if (existAssetMap.has(asset.uuid)) return existAssetMap.get(asset.uuid);
      throw new BadRequestException(`Asset "${asset.uuid}" not found.`);
    }) as ExpoModel.ExpoAsset[];
  }

  private getAssetHash(file: Express.Multer.File): string {
    return createHash(file.buffer, 'sha256', 'base64url');
  }

  private getAssetCreateDto(
    platform: ExpoPlatform,
    { path: assetPath, ext }: ExpoAssetMetadataDto,
    fileMap: Map<string, Express.Multer.File>,
  ): CreationAttributes<ExpoModel.ExpoAsset> {
    const [, uuid] = assetPath.split('/');
    const file = fileMap.get(uuid);
    if (!file) throw new BadRequestException(`Asset "${uuid}" not found in uploaded files.`);

    const hash = this.getAssetHash(file);
    const contentType = mime.getType(ext) ?? file.mimetype ?? 'application/octet-stream';

    return { uuid: hex2UUID(uuid), platform, type: ExpoAssetType.Asset, ext, hash, contentType };
  }

  private getBundleCreateDto(
    platform: ExpoPlatform,
    assetPath: string,
    fileMap: Map<string, Express.Multer.File>,
  ): CreationAttributes<ExpoModel.ExpoAsset> {
    const [, filename] = assetPath.split('/');
    const file = fileMap.get(filename);
    if (!file) throw new BadRequestException(`Asset "${filename}" not found in uploaded files.`);

    const hash = this.getAssetHash(file);
    const contentType = 'application/javascript';
    const matchResult = filename.match(bundleNameRegex);
    if (!matchResult)
      throw new BadRequestException(
        `Invalid bundle name: ${filename}. Bundle name must match ${bundleNameRegex}`,
      );
    const [, , uuid] = matchResult;

    return {
      uuid: hex2UUID(uuid),
      platform,
      type: ExpoAssetType.Bundle,
      ext: 'bundle',
      hash,
      contentType,
    };
  }

  private async getPrivateKey() {
    const privateKeyPath = this.config.get('PRIVATE_KEY_PATH');
    if (!privateKeyPath) return null;

    return fs.readFile(path.resolve(privateKeyPath), 'utf8');
  }

  private convertToDictionaryItemsRepresentation(obj: { [key: string]: string }): Dictionary {
    return new Map(
      Object.entries(obj).map(([k, v]) => {
        return [k, [v, new Map()]];
      }),
    );
  }
}
