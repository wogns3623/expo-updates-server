import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from './multer.expo.service';

export const ExpoMulterDynamicModule = MulterModule.registerAsync({
  imports: [ConfigModule],
  useClass: MulterConfigService,
});
export default ExpoMulterDynamicModule;
