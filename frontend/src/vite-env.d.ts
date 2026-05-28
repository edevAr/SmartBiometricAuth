/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL completa del API (opcional; si falta en dev, se usa el hostname de la ventana + puerto). */
  readonly VITE_BACKEND_URL?: string;
  /** Puerto del API si usas hostname automático (default 3000). */
  readonly VITE_BACKEND_PORT?: string;
  /** URL de la imagen de fondo en la pantalla de autenticación (login, registro, etc.) */
  readonly VITE_AUTH_BACKGROUND_IMAGE?: string;
}
