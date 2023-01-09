// @index(['./*', '!./index.ts', '!./*.(spec|test).ts'], f => f.path.endsWith('.module') ? `import { default as Module } from '${f.path}';\nexport default Module;\nexport * from '${f.path}';` : `export * from '${f.path}';`)
export * from './expo.update.controller';
import { default as Module } from './expo.update.module';
export default Module;
export * from './expo.update.module';
export * from './expo.update.service';
export * from './expo.update.types';
export * from './models';
