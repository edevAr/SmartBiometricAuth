export type BackendUrlInput = {
  viteBackendUrl?: string;
  dev: boolean;
  hostname?: string;
  backendPort?: string;
};

/**
 * Lógica pura de resolución de URL (testeable sin `import.meta`).
 */
export function buildBackendBaseUrl(opts: BackendUrlInput): string {
  const explicit = opts.viteBackendUrl?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  if (opts.dev && opts.hostname) {
    const port = opts.backendPort?.trim() || '3000';
    return `http://${opts.hostname}:${port}`;
  }
  return 'http://localhost:3000';
}

/**
 * URL base del API NestJS.
 * - Si existe `VITE_BACKEND_URL` en .env, se usa siempre (producción o override).
 * - En desarrollo (`npm run dev`), si no hay variable, usa el mismo host que la página
 *   (así http://192.168.x.x:5173 llama a http://192.168.x.x:3000).
 */
export function resolveBackendBaseUrl(): string {
  return buildBackendBaseUrl({
    viteBackendUrl: import.meta.env.VITE_BACKEND_URL,
    dev: import.meta.env.DEV,
    hostname: typeof window !== 'undefined' ? window.location?.hostname : undefined,
    backendPort: import.meta.env.VITE_BACKEND_PORT,
  });
}
