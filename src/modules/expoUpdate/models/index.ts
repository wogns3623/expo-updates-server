import { isModelClass } from '@util/sequelize';
import * as ExpoModel from './models';

export { ExpoModel };

export type ExpoModelTypes = typeof ExpoModel;
export const expoModels = Object.values(ExpoModel).filter(isModelClass);
