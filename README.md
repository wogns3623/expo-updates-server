## Description

Custom expo update server using [NestJS](https://github.com/nestjs/nest)

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn start

# watch mode
$ yarn start:dev

# production mode
$ yarn start:prod
```

## How to use

1. Modify app.config.js or something.

   ```js
   // in app.config.js
   module.exports = {
     // ...

     // Remove exist options
     // updates: {
     //   url: `https://u.expo.dev/${expoProjectId}`,
     //   fallbackToCacheTimeout: 0,
     // },

     // Use it instead
     updates: {
       url: `https://example.server.com/api/manifest`,
       enabled: true,
       fallbackToCacheTimeout: 30000,
       codeSigningCertificate: './secrets/certificate.pem',
       codeSigningMetadata: { keyid: 'main', alg: 'rsa-v1_5-sha256' },
     },
     // ...
   };
   ```

2. Rebuild your app.

3. Upload new release to your server.

   ```bash
   ./scripts/upload/sh -d /path/to/build -v 1.0.0 https://example.server.com/api/upload
   ```

4. Rerun your app to get new update.
5. Enjoy!

## Todo

- [ ] Add tests
- [ ] Add pretty frontend gui
- [ ] Add compressed build file upload (such as `build.tar.gz`)
