## Description

Custom expo update server using [NestJS](https://github.com/nestjs/nest)

### *Currently expo updates with custom update server has an issue*
- There is currently an [issue](https://github.com/expo/expo/pull/21787) with expo-updates that forces it to override all asset urls with expo cdn urls, even when using a custom updates server.
- This is fine if expo cdn server is working properly for you, but if you want to change this default behavior for any reason, there is a way to modify your project's expo-updates package directly via [patch-package](https://www.npmjs.com/package/patch-package) or something.

## Installation

- Need Mysql or MariaDB

- create new certificate (if you want to use code signing)

  ```bash
  yarn certificate:generate
  ```

- install dependencies

  ```bash
  yarn install
  ```

## Running the app

```bash
# development
yarn start

# watch mode
yarn start:dev

# production mode
yarn start:prod
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
       url: `https://example.com/api/update/expo/manifests/release/default/latest`,
       // or use releaseName
       // url: `https://example.com/api/update/expo/manifests/release/${releaseName}/latest`,
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
   ./scripts/upload/sh -d /path/to/build -v 1.0.0 https://example.com/api/update/expo/upload
   ```

4. Rerun your app to get new update.
5. Enjoy!

## Todo

- [ ] Add tests
- [ ] Add pretty frontend gui
- [ ] Add compressed build file upload (such as `build.tar.gz`)
