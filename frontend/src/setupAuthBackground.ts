/**
 * URL por defecto si no defines VITE_AUTH_BACKGROUND_IMAGE en .env
 */
export const DEFAULT_AUTH_BACKGROUND_IMAGE =
  'https://i0.wp.com/authme.com/wp-content/uploads/2024/03/shutterstock_2231566279-1.webp';

/**
 * Aplica la variable CSS --auth-bg-image según entorno (Vite solo expone vars con prefijo VITE_).
 */
export function setupAuthBackground(): void {
  const fromEnv = import.meta.env.VITE_AUTH_BACKGROUND_IMAGE?.trim();
  const url =
    fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_AUTH_BACKGROUND_IMAGE;
  const escaped = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  document.documentElement.style.setProperty(
    '--auth-bg-image',
    `url("${escaped}")`,
  );
}
