import { BelongsTo as BelongsToAssociation } from 'sequelize';
import { BelongsTo, Column, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';

import { ExpoAsset, ExpoCommonAsset } from './expo.asset.model';
import { ExpoManifest } from './expo.manifest.model';

@Table({
  modelName: 'ExpoManifest_Asset',
  tableName: 'ExpoManifest_Asset',
  timestamps: false,
})
export class ExpoManifest_Asset
  extends Model<ExpoManifest_AssetAttributes, ExpoManifest_AssetCreationAttributes>
  implements IExpoManifest_Asset
{
  @PrimaryKey
  @ForeignKey(() => ExpoManifest)
  @Column
  manifestId: number;

  @BelongsTo(() => ExpoManifest)
  manifest?: ExpoManifest | null;

  @PrimaryKey
  @ForeignKey(() => ExpoAsset)
  @Column
  assetId: number;

  @BelongsTo(() => ExpoAsset, { scope: { type: 'asset' } })
  asset?: ExpoCommonAsset | null;

  declare static associations: {
    manifest: BelongsToAssociation<ExpoManifest_Asset, ExpoManifest>;
    asset: BelongsToAssociation<ExpoManifest_Asset, ExpoAsset>;
  };
}

interface IExpoManifest_Asset {
  manifestId: number;
  manifest?: ExpoManifest | null;
  assetId: number;
  asset?: ExpoCommonAsset | null;
}

interface ExpoManifest_AssetAttributes extends Omit<IExpoManifest_Asset, 'manifest' | 'asset'> {}

interface ExpoManifest_AssetCreationAttributes extends ExpoManifest_AssetAttributes {}
