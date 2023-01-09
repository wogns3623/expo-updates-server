import { ExpoClientConfig, Platform } from '@expo/config';
import { createValidator, TransformJsonString } from '@util/validator';
import { Expose, plainToInstance, Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsNotEmpty, IsObject, IsOptional, ValidateNested } from 'class-validator';

export class ManifestRequestHeaderDto {
  @Expose({ name: 'expo-platform', toClassOnly: true })
  @IsOptional()
  platform?: Platform;

  @Expose({ name: 'expo-runtime-version', toClassOnly: true })
  @IsOptional()
  runtimeVersion?: string;

  @Expose({ name: 'expo-release-channel', toClassOnly: true })
  @IsOptional()
  channelName?: string;

  @Expose({ name: 'expo-expect-signature', toClassOnly: true })
  @IsOptional()
  expectSignature?: string;

  static validate = createValidator(ManifestRequestHeaderDto, { sync: true });
}

export class ManifestQueryDto {
  @Expose({ name: 'platform', toClassOnly: true })
  @IsOptional()
  platform?: Platform;

  @Expose({ name: 'runtime-version', toClassOnly: true })
  @IsOptional()
  runtimeVersion?: string;

  @Expose({ name: 'channel-name', toClassOnly: true })
  @IsOptional()
  channelName?: string;
}

export class ManifestRequestDto {
  @IsIn(['ios', 'android'])
  platform: Platform;

  @IsNotEmpty()
  runtimeVersion: string;

  @IsOptional()
  channelName: string;

  @IsOptional()
  expectSignature?: string;

  static validate = createValidator(ManifestRequestDto, { sync: true });
}

export class ExpoAssetMetadataDto {
  @IsNotEmpty()
  path: string;

  @IsNotEmpty()
  ext: string;
}

export class ExpoPlatformAssetMetadataDto {
  @IsNotEmpty()
  bundle: string;

  @Type(() => ExpoAssetMetadataDto)
  @IsArray()
  @ValidateNested({ each: true })
  assets: ExpoAssetMetadataDto[];
}

class ExpoFileMetadataDto {
  @Type(() => ExpoPlatformAssetMetadataDto)
  @IsOptional()
  @ValidateNested()
  android?: ExpoPlatformAssetMetadataDto;

  @Type(() => ExpoPlatformAssetMetadataDto)
  @IsOptional()
  @ValidateNested()
  ios?: ExpoPlatformAssetMetadataDto;
}

export class ExpoMetadataDto {
  @IsNotEmpty()
  version: number;

  @IsNotEmpty()
  bundler: string;

  @Type(() => ExpoFileMetadataDto)
  @ValidateNested()
  fileMetadata: ExpoFileMetadataDto;
}

export class UploadUpdateBodyDto {
  @IsNotEmpty()
  runtimeVersion: string;

  @TransformJsonString()
  @Transform(({ value }) => {
    return plainToInstance(ExpoMetadataDto, value);
  })
  @ValidateNested()
  metadata: ExpoMetadataDto;

  @TransformJsonString()
  @IsOptional()
  @IsObject()
  expoClient?: ExpoClientConfig;
}
