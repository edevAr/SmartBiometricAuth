# Plataforma Full Stack de Seguridad Inteligente con Autenticación Biométrica

## 📜 Descripción
Sistema de seguridad domiciliaria inteligente que integra cámaras IP, reconocimiento biométrico de voz y rostro, control de acceso automatizado y gestión preventiva de alertas. Permite verificar en tiempo real la identidad de las personas que ingresan y actuar de forma inmediata ante intrusiones.

## 📦 Alcance
*Incluye:*
- Captura de eventos de ingreso mediante cámaras IP.
- Verificación biométrica multimodal (rostro y voz).
- Control de acceso automatizado.
- Gestión preventiva de alertas.
- Panel administrativo.
- Reportes y auditoría.

*No incluye:*
- Provisión física de cámaras o infraestructura.
- Integración con sistemas internos de terceros.

## 🛠 Stack Tecnológico
- *Frontend:* React + TypeScript, WebAuthn/FIDO2, WebSocket/EventSource.
- *Backend:* Node.js + NestJS o Java + Spring Boot, PostgreSQL, MongoDB, S3, Kafka/RabbitMQ.
- *Infraestructura:* Docker, Kubernetes, Terraform, CI/CD.
- *Seguridad:* OAuth 2.0, OIDC, JWT, cifrado TLS, OWASP Top 10, NIST 800‑63, NIST 800‑207.

## 🏗 Arquitectura
Cliente (Frontend) → API Gateway → Microservicios Backend → Bases de Datos / Almacenamiento → Servicios Biométricos → Sistema de Notificaciones.

## 🔌 Endpoints Core (Ejemplos)
1. *POST /ingesta* – Captura evento de ingreso.
2. *POST /verificacion* – Verificación biométrica.
3. *POST /acceso* – Autoriza o deniega ingreso.
4. *GET /alertas* – Lista alertas.
5. *GET /auditoria* – Consulta eventos.

## ⚙️ Variables de Entorno (Ejemplo)
```env
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/dbname
MONGO_URI=mongodb://localhost:27017/security
S3_BUCKET=biometria
OAUTH_CLIENT_ID=...
OAUTH_CLIENT_SECRET=...
JWT_SECRET=...
