import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { IntlayerProvider } from 'react-intlayer';

import './styles.css';
import { JaspInfoProvider } from './useInfo';

export const queryClient = new QueryClient();

export function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter defaultOptions={{ clearOnDefault: false }}>
      <IntlayerProvider>
        <QueryClientProvider client={queryClient}>
          <JaspInfoProvider>{children}</JaspInfoProvider>
        </QueryClientProvider>
      </IntlayerProvider>
    </NuqsAdapter>
  );
}
