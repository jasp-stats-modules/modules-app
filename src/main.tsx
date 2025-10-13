import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import './styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { App } from './App.tsx';
import './i18n.ts';
import reportWebVitals from './reportWebVitals.ts';

export const queryClient = new QueryClient();

// Render the app
const rootElement = document.getElementById('app');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <NuqsAdapter defaultOptions={{ clearOnDefault: false }}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </NuqsAdapter>
    </StrictMode>,
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
