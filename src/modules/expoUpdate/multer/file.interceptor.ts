import { CallHandler, ExecutionContext, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { unlink } from 'fs/promises';
import { catchError, Observable } from 'rxjs';

interface PromiseRejectedResult {
  status: 'rejected';
  reason: any;
}
export class FileTransactionInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      catchError(async (err, caught) => {
        if (req.acceptedFiles) {
          const results = await Promise.allSettled(
            req.acceptedFiles.map(file => (file.accepted ? unlink(file.path) : Promise.resolve())),
          );

          const failed = results.filter(
            result => result.status === 'rejected',
          ) as PromiseRejectedResult[];

          if (failed.length > 0)
            Logger.log(
              `Failed to delete files: ${failed.map(result => result.reason)}`,
              'FileTransactionInterceptor',
            );
        }

        throw err;
      }),
    );
  }
}
