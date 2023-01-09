import { BINARY_UUID } from '@util/sequelize';
import { UUID2Hex } from '@util/uuid';
import appRootPath from 'app-root-path';
import { createReadStream } from 'fs';
import path from 'path';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

import { ExpoUpdatesManifestAsset } from '@expo/config';

import { ExpoPlatform, ExpoPlatformList } from '../expo.update.types';

export enum ExpoAssetType {
  Asset = 'asset',
  Bundle = 'bundle',
}
export const ExpoAssetTypeList = Object.values(ExpoAssetType);

@Table({
  modelName: 'ExpoAsset',
  tableName: 'ExpoAsset',
})
export class ExpoAsset extends Model<ExpoAssetAttribute, ExpoAssetCreationAttribute> {
  readonly id: number;

  @Column(BINARY_UUID())
  uuid: string;

  @Column(DataType.ENUM(...ExpoPlatformList))
  platform: ExpoPlatform;

  @Column(DataType.ENUM(...ExpoAssetTypeList))
  type: ExpoAssetType;

  @Column
  ext: string;

  @Column
  contentType: string;

  @Column
  hash: string;

  getUrl(requestUrl: string) {
    return `${requestUrl}/${this.uuid}`;
  }

  toMetadata(requestUrl: string): ExpoUpdatesManifestAsset & { fileExtension: string } {
    // asset의 uuid(파일명)은 기본적으로 key와 동일하게 생성됨 `createHash(file.buffer, 'md5', 'hex');`
    return {
      key: this.uuid,
      hash: this.hash,
      fileExtension: `.${this.ext}`,
      contentType: this.contentType,
      url: this.getUrl(requestUrl),
    };
  }

  toStream(storagePath: string) {
    return createReadStream(
      path.resolve(appRootPath.path, storagePath, 'assets', UUID2Hex(this.uuid)),
    );
  }

  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date | null;
}

export interface ExpoCommonAsset extends ExpoAsset {
  type: ExpoAssetType.Asset;
}

export interface ExpoBundleAsset extends ExpoAsset {
  type: ExpoAssetType.Bundle;
  ext: 'js';
  contentType: 'application/javascript';
}

export interface IExpoAsset {
  id: number;
  uuid: string;
  platform: ExpoPlatform;
  type: ExpoAssetType;
  ext: string;
  contentType: string;
  hash: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
interface ExpoAssetAttribute extends IExpoAsset {}
interface ExpoAssetCreationAttribute extends Omit<ExpoAssetAttribute, 'id' | `${string}At`> {}
