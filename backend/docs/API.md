# API SecureHome / Smart Biometric Authenticator

## Autenticación (JWT)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Registro (rol `AUTHORIZED`). |
| POST | `/auth/login` | No | Devuelve `access_token` y datos de usuario. |

Cabecera en rutas protegidas: `Authorization: Bearer <token>`

## Usuarios autorizados

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/users` | Lista (query `activeOnly=true` opcional). |
| GET | `/users/:id` | Detalle. |
| POST | `/users` | Alta (email obligatorio; password opcional). |
| PATCH | `/users/:id` | Edición parcial (`fullName`, `email`, `phone`, `relationship`, `isActive`, `password`, `roleName`). |
| POST | `/users/:id/deactivate` | Desactiva (`isActive: false`). |
| GET | `/users/:id/biometric-profile` | Perfil biométrico o `null`. |
| POST | `/users/:id/biometric-profile` | Crear/actualizar (`faceTemplateRef`, `voiceTemplateRef`, `status`). |

## Accesos y seguridad

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/access/attempts` | No | Registra intento (`outcome`: GRANTED \| DENIED \| UNKNOWN). Si no es GRANTED, crea `security_event` y `alert`. |
| GET | `/access-logs` | Sí | Historial de intentos. |
| GET | `/security-events` | Sí | Eventos de seguridad. |
| GET | `/alerts` | Sí | Alertas. |
| PATCH | `/alerts/:id` | Sí | Actualizar `status` (OPEN \| ACKNOWLEDGED \| RESOLVED). |

## Legacy (sin JWT, desarrollo)

- `GET/POST /contacts`
- `GET/POST /cameras`
- `GET /events`

## Base de datos (tablas)

- `roles` — ADMIN, OPERATOR, AUTHORIZED  
- `users` — credenciales opcionales, rol, datos de persona autorizada  
- `biometric_profiles` — referencias a plantillas (MVP: strings)  
- `access_logs` — intentos de acceso  
- `security_events` — incidentes derivados de accesos u otros  
- `alerts` — alertas operativas vinculadas a eventos  

Más tablas existentes: `trusted_contacts`, `cameras`, `events`.
