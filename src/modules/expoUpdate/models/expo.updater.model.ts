import { BelongsTo as BelongsToAssociation } from 'sequelize';
import { BelongsTo, Column, ForeignKey, Model, Table } from 'sequelize-typescript';

import { BINARY_UUID } from '@util/sequelize';
import { ExpoManifest } from './expo.manifest.model';

/**
 * @todo Add more client data
 */
@Table({
  modelName: 'ExpoUpdater',
  tableName: 'ExpoUpdater',
  timestamps: true,
  paranoid: true,
})
export class ExpoUpdater
  extends Model<ExpoUpdaterAttributes, ExpoUpdaterCreationAttributes>
  implements IExpoUpdater
{
  readonly id: number;

  @Column(BINARY_UUID())
  uuid: string;

  @ForeignKey(() => ExpoManifest)
  @Column
  manifestId?: number | null;

  @BelongsTo(() => ExpoManifest)
  manifest?: ExpoManifest | null;

  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date | null;

  declare static associations: {
    manifest: BelongsToAssociation<ExpoUpdater, ExpoManifest>;
  };
}

interface IExpoUpdater {
  id: number;
  uuid: string;
  manifestId?: number | null;
  manifest?: ExpoManifest | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

interface ExpoUpdaterAttributes extends Omit<IExpoUpdater, 'manifest'> {}

interface ExpoUpdaterCreationAttributes extends Omit<ExpoUpdaterAttributes, 'id' | `${string}At`> {}
