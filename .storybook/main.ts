import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: [getAbsolutePath('@storybook/addon-vitest')],
  // The app's PWA, .htaccess and version.json plugins only make sense for the
  // app build.
  viteFinal: (config) => ({
    ...config,
    plugins: (config.plugins ?? []).flat().filter((plugin) => {
      const name =
        plugin && typeof plugin === 'object' && 'name' in plugin
          ? String(plugin.name)
          : '';
      return (
        !name.startsWith('vite-plugin-pwa') &&
        name !== 'spoticast:htaccess' &&
        name !== 'spoticast:version'
      );
    }),
  }),
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {
      builder: {
        viteConfigPath: 'vite.config.mts',
      },
    },
  },
};

function getAbsolutePath(value: string): any {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

export default config;
