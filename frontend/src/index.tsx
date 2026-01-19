import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';
// --- NOVÉ IMPORTY ---
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// --- VYTVOŘENÍ KLIENTA ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Aby se data nenačítala při každém kliknutí do okna
      retry: 1, // Zkusit znovu jen jednou při chybě
      staleTime: 1000 * 60 * 5, // Data jsou "čerstvá" 5 minut (nevolá se API zbytečně)
    },
  },
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId || ""}>
      {/* --- OBALENÍ APLIKACE --- */}
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);