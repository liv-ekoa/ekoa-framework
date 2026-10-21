import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { config } from './lib/config';
import App from './App';
import './fonts/fonts.css';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import './index.css';
import 'leaflet/dist/leaflet.css';

/** Shown only if the site was built without its database settings. */
function NotConfigured() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-4xl">Ekoa is being set up</h1>
      <p className="mt-4 text-ink-soft">The site is not connected to its database yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README.md), then build again.</p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {config.configured ? (
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <NotConfigured />
    )}
  </React.StrictMode>,
);
