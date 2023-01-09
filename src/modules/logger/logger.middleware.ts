import { Injectable, Logger, NestMiddleware } from '@nestjs/common';

import { Handler, Request, Response } from 'express';
import morgan, { format } from 'morgan';

const tryParse = (str: string) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};

// token('request-body', (req: Request, res: any) => {
//   return JSON.stringify(req.body);
// });
// token('response-body', (req: Request, res: any) => {
//   const { resBody } = res;
//   // TODO: 크기가 클 때 info log에는 축약된 버전만 보내도록 수정
//   // - 2 depth까지
//   // - 문자열 100자까지만
//   // - 배열은 5개까지만
//   // - 객체 프로퍼티는 10개까지만
//   // return typeof resBody === 'string' ? resBody : JSON.stringify(resBody);
//   Logger.verbose(
//     {
//       message: 'response body',
//       body: typeof resBody === 'string' ? resBody : JSON.stringify(resBody),
//     },
//     'Morgan',
//   );
//   return '';
// });

format(
  'custom',
  ':remote-addr ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms', // + ' :request-body :response-body'
);

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  logger: Handler;
  constructor() {
    this.logger = morgan('custom', {
      stream: {
        write: (message: string) => {
          Logger.log(message, 'Morgan');
        },
      },
    });
  }

  use(req: Request, res: Response, next: () => void) {
    // Logger.verbose(`start handle request ${req.method} ${req.originalUrl}`, 'Morgan');
    const originalSend = res.send;

    res.send = function (body: any) {
      (res as any).resBody = body;
      return originalSend.call(this, body);
    };

    this.logger(req, res, next);
  }
}

export const LOGGER_MIDDLEWARE = Symbol('injectable:middleware:morgan');
