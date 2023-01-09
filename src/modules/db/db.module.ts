import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SequelizeModule } from '@nestjs/sequelize';

export const SequelizeDynamicModule = SequelizeModule.forRootAsync({
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const isProduction = config.get('NODE_ENV') === 'production';
    return {
      dialect: config.get('DB_DIALECT'),
      host: config.get('DB_HOST'),
      port: config.get('DB_PORT'),
      username: config.get('DB_USERNAME'),
      password: config.get('DB_PASSWORD'),
      database: config.get('DB_DATABASE'),

      models: [],

      logging: !isProduction
        ? (sql, time, ...args) => {
            Logger.debug(sql.replace('Executed', `Executed [${time}ms]`), 'DBService(default)');
          }
        : false,
      logQueryParameters: !isProduction,
      benchmark: !isProduction,
      timezone: '+09:00',
      dialectOptions: {
        supportBigNumbers: true,
        bigNumberStrings: true,
      },

      pool: {
        max: 50,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },

      autoLoadModels: true,
      // sync: { force: true },
    };
  },
});

export default SequelizeDynamicModule;
