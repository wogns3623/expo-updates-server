import { IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { address as ipAddress } from 'ip';

import { createValidator } from '@util/validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

enum Dialect {
  MySQL = 'mysql',
  PostgreSQL = 'postgres',
  SQLite = 'sqlite',
  MariaDB = 'mariadb',
  MSSQL = 'mssql',
  DB2 = 'db2',
  Snowflake = 'snowflake',
  Oracle = 'oracle',
}

export class EnvironmentVariables {
  // Common

  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  APP_NAME: string;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  PORT: number = 3000 as const;

  /**
   * @default current local ipv4 address
   */
  @IsOptional()
  @IsString()
  HOSTNAME: string = `${ipAddress()}${this.PORT === 80 ? '' : `:${this.PORT}`}`;

  @IsOptional()
  @IsIn(['error', 'warn', 'info', 'verbose', 'debug'])
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'verbose' | 'debug' = 'debug';

  // DB
  @IsOptional()
  @IsEnum(Dialect)
  DB_DIALECT: Dialect = Dialect.MySQL;

  @IsString()
  DB_HOST: string;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  DB_PORT: number = 3306 as const;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE: string;

  // File
  /**
   * 로컬 파일 저장공간 path
   * 상대 경로로 작성할시 기준은 root path
   *
   * @default './storage'
   */
  @IsString()
  FILE_LOCAL_STORAGE_PATH: string = './storage';

  // sSigning

  @IsOptional()
  @IsString()
  PRIVATE_KEY_PATH?: string | null;
}

export const validateConfig = createValidator(EnvironmentVariables, {
  transformToInstanceOptions: { exposeDefaultValues: true },
  sync: true,
});
