import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config';

/** Icons of the beta channel build (VITE_CHANNEL=beta), next to its logo. */
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset,
  images: ['public/icons-beta/logo.svg'],
});
