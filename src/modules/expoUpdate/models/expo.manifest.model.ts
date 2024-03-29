import { ExpoUpdatesManifest } from '@expo/config';
import {
  BelongsTo as BelongsToAssociation,
  BelongsToMany as BelongsToManyAssociation,
  CreationAttributes,
  HasMany as HasManyAssociation,
} from 'sequelize';
import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';

import { BINARY_UUID, JSON_STRING } from '@util/sequelize';

import { ExpoPlatform, ExpoPlatformList } from '../expo.update.types';
import { ExpoAsset, ExpoBundleAsset, ExpoCommonAsset } from './expo.asset.model';
import { ExpoManifest_Asset } from './expo.asset_manifest.model';
import { ExpoUpdater } from './expo.updater.model';

@Table({
  modelName: 'ExpoManifest',
  tableName: 'ExpoManifest',
  timestamps: true,
  paranoid: true,
})
export class ExpoManifest
  extends Model<ExpoManifestAttributes, ExpoManifestCreationAttributes>
  implements IExpoManifest
{
  readonly id: number;

  @Column(BINARY_UUID())
  uuid: string;

  @Column
  runtimeVersion: string;

  @Column
  releaseName: string;

  @Column(DataType.ENUM(...ExpoPlatformList))
  platform: ExpoPlatform;

  @ForeignKey(() => ExpoAsset)
  @Column
  launchAssetId: number;

  @BelongsTo(() => ExpoAsset, { scope: { type: 'bundle' } })
  launchAsset?: ExpoBundleAsset | null;

  @BelongsToMany(() => ExpoAsset, { through: () => ExpoManifest_Asset, scope: { type: 'asset' } })
  assets?: ExpoCommonAsset[];
  @HasMany(() => ExpoManifest_Asset)
  ExpoManifest_Assets: ExpoManifest_Asset[];

  @Column(JSON_STRING(DataType.TEXT('medium')))
  metadata: ExpoUpdatesManifest['metadata'];

  @Column(JSON_STRING(DataType.TEXT('medium')))
  extra: ExpoUpdatesManifest['extra'];

  /** updater currently using this version of manifest */
  @HasMany(() => ExpoUpdater)
  updaters?: ExpoUpdater[];

  toUpdatesManifest(
    this: this & {
      launchAsset: ExpoBundleAsset;
      assets: ExpoCommonAsset[];
    },
    requestUrl: string,
  ): ExpoUpdatesManifest {
    const updatesManifestAssets = this.assets.map(asset => asset.toMetadata(requestUrl));
    const updatesManifestLaunchAsset = this.launchAsset.toMetadata(requestUrl);

    const updatesManifest: ExpoUpdatesManifest = {
      id: this.uuid,
      createdAt: this.createdAt.toISOString(),
      runtimeVersion: this.runtimeVersion,
      launchAsset: updatesManifestLaunchAsset,
      assets: updatesManifestAssets,
      metadata: this.metadata,
      extra: this.extra,
    };

    return updatesManifest;
  }

  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date | null;

  declare static associations: {
    launchAsset: BelongsToAssociation<ExpoManifest, ExpoAsset>;
    assets: BelongsToManyAssociation<ExpoManifest, ExpoAsset>;
    ExpoManifest_Assets: HasManyAssociation<ExpoManifest, ExpoManifest_Asset>;
    updaters: BelongsToManyAssociation<ExpoManifest, ExpoUpdater>;
  };
}

interface IExpoManifest {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  uuid: string;
  runtimeVersion: string;
  releaseName: string;
  platform: ExpoPlatform;
  launchAssetId: number;
  launchAsset?: ExpoBundleAsset | null;
  assets?: ExpoCommonAsset[];
  ExpoManifest_Assets: ExpoManifest_Asset[];
  metadata: ExpoUpdatesManifest['metadata'];
  extra: ExpoUpdatesManifest['extra'];
}

interface ExpoManifestAttributes
  extends Omit<IExpoManifest, 'launchAsset' | 'assets' | 'ExpoManifest_Assets'> {}

interface ExpoManifestCreationAttributes
  extends Omit<ExpoManifestAttributes, 'id' | `${string}At`> {
  ExpoManifest_Assets?: Partial<CreationAttributes<ExpoManifest_Asset>>[];
  assets?: CreationAttributes<ExpoAsset>[];
}
