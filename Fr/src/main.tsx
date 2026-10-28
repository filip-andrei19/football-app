import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' 
import './globals.css'
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

Sentry.init({
  dsn: "https://609ea9a88e1ad7c602a3e36b782a6ebb@o4512306562596864.ingest.de.sentry.io/4512306651332688",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0, 
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0, 
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)