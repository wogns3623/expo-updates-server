import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ExpoUpdateController } from './expo.update.controller';
import { ExpoUpdateService } from './expo.update.service';
import { expoModels } from './models';
import { ExpoMulterDynamicModule } from './multer';

@Module({
  imports: [SequelizeModule.forFeature(expoModels), ExpoMulterDynamicModule],
  controllers: [ExpoUpdateController],
  providers: [ExpoUpdateService],
  exports: [SequelizeModule],
})
export class ExpoUpdateModule {}

export default ExpoUpdateModule;
