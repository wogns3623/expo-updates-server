import { Include, isNotNullable } from '@util/types';
import { Model, ModelStatic } from 'sequelize';

export const isModelClass = <T>(m: T): m is Include<T, ModelStatic<Model<any, any>>> =>
  isNotNullable(m) && (m as any).prototype instanceof Model;

export type ModelClassOnly<T> = T extends ModelStatic<infer M> ? M : never;
