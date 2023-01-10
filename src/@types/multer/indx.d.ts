import 'multer';

declare global {
  export namespace Express {
    namespace Multer {
      /** Object containing file metadata and access information. */
      interface File {
        // weather file is accepted or not
        accepted: boolean;
        rejectReason?: unknown;
      }

      interface RejectedFile extends File {
        accepted: false;
        rejectReason?: any;
      }
    }

    interface Request {
      /**
       * Array of `Multer.File` only actually accepted by `fileFilter` options.
       */
      acceptedFiles?: Multer.File[] | undefined;
    }
  }
}
