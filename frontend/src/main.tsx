import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { SessionProvider } from './auth/SessionProvider';
import { CartProvider } from './cart/CartProvider';
import { ToastProvider } from './components/ui/Toast';
import { App } from './App';
import './index.css';
import { registrarServiceWorker } from './lib/registrarServiceWorker';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (intentos, error) => {
        const estado = (error as AxiosError)?.response?.status;
        if (estado && estado < 500) return false;
        return intentos < 2;
      },
    },
  },
});

registrarServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <SessionProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </SessionProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
