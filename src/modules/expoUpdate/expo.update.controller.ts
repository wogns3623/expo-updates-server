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
import { Response } from 'express';
import FormData from 'form-data';
import lodash from 'lodash';
import { Readable } from 'stream';

import {
  ManifestQueryDto,
  ManifestRequestDto,
  ManifestRequestHeaderDto,
  UploadUpdateBodyDto,
} from './dtos';
import { ExpoUpdateService } from './expo.update.service';

@Controller()
export class ExpoUpdateController {
  constructor(
    private readonly config: ConfigService,
    private readonly expoUpdateService: ExpoUpdateService,
  ) {}

  /**
   * @todo Support expo-manifest-filters and expo-server-defined-headers
   */
  @Header('cache-control', 'private, max-age=0')
  @Header('expo-protocol-version', '0')
  @Header('expo-sfv-version', '0')
  @Get('manifest')
  async getManifest(
    @Headers() headers: ManifestRequestHeaderDto,
    @Query() query: ManifestQueryDto,
    @Res() res: Response,
  ) {
    headers = ManifestRequestHeaderDto.validate(headers);
    const options = ManifestRequestDto.validate(lodash.defaults({}, headers, query));

    const form = new FormData();

    const manifest = await this.expoUpdateService.getManifest(options);

    let signature = null;
    // TODO: Parse expectSignature & use it properly
    if (options.expectSignature) signature = await this.expoUpdateService.getSignature(manifest);

    form.append('manifest', JSON.stringify(manifest), {
      contentType: 'application/json',
      header: {
        'content-type': 'application/json; charset=utf-8',
        ...(signature ? { 'expo-signature': signature } : {}),
      },
    });

    // No extensions
    // If you need extensions, you can modify `expoUpdateService.getAssetRequestHeaders` to return the headers you need
    const assetRequestHeaders = await this.expoUpdateService.getAssetRequestHeaders(manifest);

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
    return asset.toStream(this.config.get('FILE_LOCAL_STORAGE_PATH')).pipe(res);
  }

  /**
   * @todo Support upload compressed build files, like build.tar.gz
   */
  @UseInterceptors(FilesInterceptor('assets'))
  @Post('upload')
  async uploadUpdateFiles(
    @UploadedFiles() assets: Express.Multer.File[],
    @Body() updateDto: UploadUpdateBodyDto,
  ) {
    await this.expoUpdateService.createManifest({ assets, ...updateDto });
  }
}
