export interface ExpoMetadata {
  version: number;
  bundler: string;
  fileMetadata: {
    [key in ExpoPlatform]: {
      bundle: string;
      assets: {
        path: string;
        ext: string;
      }[];
    };
  };
}

export enum ExpoPlatform {
  Android = 'android',
  IOS = 'ios',
}
export const ExpoPlatformList = Object.values(ExpoPlatform);

export interface ExpoMetadataInfo {
  updateBundlePath: string;
  runtimeVersion: string;
}
interface BaseExpoAssetMetadataInfo extends ExpoMetadataInfo {
  filePath: string;
  platform: ExpoPlatform;
  isLaunchAsset: boolean;
  ext: string | null;
}

export interface ExpoCommonAssetMetadataInfo extends BaseExpoAssetMetadataInfo {
  isLaunchAsset: false;
  ext: string;
}

export interface ExpoLaunchAssetMetadataInfo extends BaseExpoAssetMetadataInfo {
  isLaunchAsset: true;
  ext: null;
}

export type ExpoAssetMetadataInfo = ExpoCommonAssetMetadataInfo | ExpoLaunchAssetMetadataInfo;

export interface ExpoAssetInfo extends ExpoMetadataInfo {
  platform: ExpoPlatform;
  assetName: string;
}

export interface ManifestExtensions {
  assetRequestHeaders: ExpoAssetHeader;
}

export type ExpoAssetHeader = {
  [assetKey: string]: {
    [headerName: string]: string;
  };
};

export const hexUuidRegexRaw = '[0-9a-f]{32}';
export const bundleNameRegex = RegExp(`^(${ExpoPlatformList.join('|')})-(${hexUuidRegexRaw}).js$`);
