import { ExpoClientConfig, Platform } from '@expo/config';
import { BadRequestException } from '@nestjs/common';
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

  static validate = createValidator(ManifestRequestHeaderDto, {
    sync: true,
    exceptionFactory: errors =>
      new BadRequestException({ message: 'Validation failed', detail: { errors } }),
  });
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
  @Expose()
  @IsNotEmpty()
  @IsIn(['ios', 'android'])
  platform: Platform;

  @Expose()
  @IsNotEmpty()
  runtimeVersion: string;

  @Expose()
  @IsOptional()
  channelName: string;

  @Expose()
  @IsOptional()
  expectSignature?: string;

  static validate = createValidator(ManifestRequestDto, {
    sync: true,
    transformToInstanceOptions: {
      enableImplicitConversion: true,
      excludeExtraneousValues: true,
      exposeDefaultValues: true,
    },
    exceptionFactory: errors =>
      new BadRequestException({ message: 'Validation failed', detail: { errors } }),
  });
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
  @IsNotEmpty()
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
  @IsNotEmpty()
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
  @IsNotEmpty()
  @ValidateNested()
  metadata: ExpoMetadataDto;

  @TransformJsonString()
  @IsOptional()
  @IsObject()
  expoClient?: ExpoClientConfig;
}
