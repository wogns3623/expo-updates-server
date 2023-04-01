import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesInterceptor } from '@nestjs/platform-express';
import { has } from '@util/types';
import { Response } from 'express';
import FormData from 'form-data';
import lodash from 'lodash';
import { Sequelize } from 'sequelize-typescript';
import { Readable } from 'stream';

import {
  ManifestRequestDto,
  ManifestRequestHeaderDto,
  ManifestRequestQueryDto,
  UploadUpdateBodyDto,
} from './dtos';
import { ExpoUpdateService } from './expo.update.service';
import { ExpoModel } from './models';
import { FileTransactionInterceptor } from './multer';

@Controller('update/expo')
export class ExpoUpdateController {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly config: ConfigService,
    private readonly expoUpdateService: ExpoUpdateService,
  ) {}

  /**
   * @todo Support expo-manifest-filters and expo-server-defined-headers
   *
   * @todo [Support expo-protocol-version 1](https://docs.expo.dev/technical-specs/expo-updates-1)
   *
   * @todo [Add directive support](https://docs.expo.dev/technical-specs/expo-updates-1/#directive-body)
   */
  @Header('cache-control', 'private, max-age=0')
  @Header('expo-protocol-version', '0')
  @Header('expo-sfv-version', '0')
  @Get('manifests/release/:releaseName/latest')
  async getLatestManifestByReleaseName(
    @Headers() headers: ManifestRequestHeaderDto,
    @Query() query: ManifestRequestQueryDto,
    @Param('releaseName') releaseName: string,
    @Res() res: Response,
  ) {
    headers = ManifestRequestHeaderDto.validate(headers);
    const options = ManifestRequestDto.validate(lodash.defaults({}, headers, query));

    const manifest = await this.expoUpdateService.getManifest({ ...options, releaseName });

    // find or create updater if updaterId is provided
    let updater: ExpoModel.ExpoUpdater | null = null;
    if (has(options, 'updaterId')) {
      updater = await this.expoUpdateService.getUpdater(options);
      await updater.update({ manifestId: manifest.id });
    }

    const requestUrl = `${this.config.get('HOSTNAME')}/api/update/expo/assets`;
    const updaterManifest = manifest.toUpdatesManifest(requestUrl);

    const form = new FormData();

    let signature = null;
    // TODO: Parse expectSignature & use it properly
    if (options.expectSignature)
      signature = await this.expoUpdateService.getSignature(updaterManifest);

    form.append('manifest', JSON.stringify(updaterManifest), {
      contentType: 'application/json',
      header: {
        'content-type': 'application/json; charset=utf-8',
        ...(signature ? { 'expo-signature': signature } : {}),
      },
    });

    // No extensions
    // If you need extensions, you can modify `expoUpdateService.getAssetRequestHeaders` to return the headers you need
    const assetRequestHeaders = await this.expoUpdateService.getAssetRequestHeaders(
      updaterManifest,
    );

    if (assetRequestHeaders)
      form.append('extensions', JSON.stringify({ assetRequestHeaders }), {
        contentType: 'application/json',
      });

    res.setHeader('content-type', `multipart/mixed; boundary=${form.getBoundary()}`);
    return Readable.from(form.getBuffer()).pipe(res);
  }

  // Set cache-control to maximum value, 1 year
  @Header('cache-control', 'public, max-age=31536000, immutable')
  @Get('assets/:assetId')
  async getAsset(@Param('assetId') assetUuid: string, @Res() res: Response) {
    const asset = await this.expoUpdateService.getAsset(assetUuid);

    res.set('content-type', asset.contentType);
    return asset.getFileStream(this.config.get('FILE_LOCAL_STORAGE_PATH')).pipe(res);
  }

  /**
   * @todo Support upload compressed build files, like build.tar.gz
   */
  @UseInterceptors(FilesInterceptor('assets'), FileTransactionInterceptor)
  @Post('upload')
  async uploadUpdateFiles(
    @UploadedFiles() assets: Express.Multer.File[],
    @Body() updateDto: UploadUpdateBodyDto,
  ) {
    await this.sequelize.transaction(async () => {
      await this.expoUpdateService.createManifest({ assets, ...updateDto });
    });
  }
}
