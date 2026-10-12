/** What was built and for which channel (see vite.config.mts). */
export type BuildInfo = typeof __APP_BUILD__;

export const APP_BUILD: BuildInfo = __APP_BUILD__;

/**
 * Build of the beta channel, served from beta.spoticast.it. Same source as
 * APP_BUILD.channel, but a literal at build time, so production drops the
 * beta-only code.
 */
export const IS_BETA = import.meta.env.VITE_CHANNEL === 'beta';

/** App logo of the channel (the beta one carries a "BETA" label). */
export const LOGO_URL = `${import.meta.env.BASE_URL}${IS_BETA ? 'icons-beta/' : ''}logo.svg`;

/** App name of the channel, for the window title. */
export const APP_TITLE = IS_BETA ? 'Spoticast Beta' : 'Spoticast';
