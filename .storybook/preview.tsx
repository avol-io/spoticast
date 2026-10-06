import type { Decorator, Preview } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import '../src/i18n';
import i18n from '../src/i18n';
import '../src/styles.css';

const withProviders: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? 'dark';
  const locale = context.globals.locale ?? 'it';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    void i18n.changeLanguage(locale);
  }, [theme, locale]);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <div className="bg-bg p-4 text-fg">
          <Story />
        </div>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const preview: Preview = {
  decorators: [withProviders],
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: ['dark', 'light'],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Language',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        items: ['it', 'en'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark', locale: 'it' },
  parameters: { layout: 'fullscreen' },
};

export default preview;
