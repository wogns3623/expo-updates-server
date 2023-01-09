import { ConfigService } from '@nestjs/config';

import '@colors/colors';
import { path as rootPath } from 'app-root-path';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import { format, transports } from 'winston';
import 'winston-daily-rotate-file';

const { combine, splat, uncolorize, timestamp } = format;

/** verbose: 콘솔에 출력 & 로그 파일에 저장, debug: 콘솔에만 출력, 저장X */
export const LoggerModule = WinstonModule.forRootAsync({
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const isProduction = config.get('NODE_ENV') === 'production';
    const isTest = config.get('NODE_ENV') === 'test';

    const level = isProduction ? 'info' : config.get('LOG_LEVEL');
    const logDir = rootPath + '/logs';

    const consoleFormat = combine(
      nestWinstonModuleUtilities.format.nestLike(config.get('APP_NAME'), {
        colors: true,
        prettyPrint: true,
      }),
    );
    const fileFormat = combine(
      nestWinstonModuleUtilities.format.nestLike(config.get('APP_NAME'), {
        colors: false,
        prettyPrint: false,
      }),
      uncolorize(),
    );

    return {
      // error, warn, info, verbose, debug
      level,
      format: combine(splat(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
      transports: [
        new transports.Console({
          silent: isTest,
          format: consoleFormat,
        }),
        new transports.DailyRotateFile({
          level: 'info',
          datePattern: 'YYYY-MM-DD',
          dirname: `${logDir}/info`,
          filename: `%DATE%.log`,
          maxFiles: 30,
          json: false,
          zippedArchive: true,
          format: fileFormat,
          silent: isTest,
        }),
        new transports.DailyRotateFile({
          level: 'error',
          datePattern: 'YYYY-MM-DD',
          dirname: `${logDir}/error`,
          filename: `%DATE%.error.log`,
          maxFiles: 30,
          handleExceptions: true,
          json: false,
          zippedArchive: true,
          format: fileFormat,
          silent: isTest,
        }),
        new transports.DailyRotateFile({
          level: 'verbose',
          datePattern: 'YYYY-MM-DD',
          dirname: `${logDir}/debug`,
          filename: `%DATE%.log`,
          maxFiles: 5,
          json: true,
          zippedArchive: true,
          format: fileFormat,
          silent: isTest,
        }),
      ],
    };
  },
});

export default LoggerModule;
