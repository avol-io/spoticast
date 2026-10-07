/** What was built and for which channel (see vite.config.mts). */
export type BuildInfo = typeof __APP_BUILD__;

export const APP_BUILD: BuildInfo = __APP_BUILD__;

/** Build of the beta channel, served from beta.spoticast.it. */
export const IS_BETA = APP_BUILD.channel === 'beta';
