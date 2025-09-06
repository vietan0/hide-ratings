declare namespace NodeJS {
  interface ProcessEnv {
    readonly WEB_EXT_API_KEY: string;
    readonly WEB_EXT_API_SECRET: string;
    readonly CHROMIUM_PROFILE: string;
    readonly EXTENSION_ID: string;
    readonly CLIENT_ID: string;
    readonly CLIENT_SECRET: string;
    readonly REFRESH_TOKEN: string;
    readonly BROWSER: 'firefox' | 'chrome';
  }
}
