# WhatsApp Agente — SaaS Multiempresa de Atención al Cliente

Plataforma SaaS multiempresa completa para atención al cliente mediante WhatsApp, con agenda automática vía Google Calendar y agentes de IA configurables.

## 🚀 Stack Tecnológico

| Capa          | Tecnología                             |
| ------------- | -------------------------------------- |
| Framework     | Next.js 16.2.6 (App Router)            |
| Lenguaje      | TypeScript Strict                      |
| Base de datos | PostgreSQL 17 + Prisma ORM             |
| Autenticación | Auth.js v5 (NextAuth)                  |
| UI            | TailwindCSS v4 + Phosphor Icons        |
| IA            | OpenAI / Gemini (Antigravity) / Custom |
| WhatsApp      | Meta Cloud API v25.0                   |
| Calendario    | Google OAuth 2.0                       |
| Cache         | Redis 7                                |
| Deploy        | Docker + Dokploy                       |
| Linting       | ESLint + Prettier                      |
| Git Hooks     | Husky + lint-staged                    |

## 📋 Índice

- [Inicio Rápido con Docker](#inicio-rápido-con-docker)
- [Desarrollo Local](#desarrollo-local)
- [Scripts Disponibles](#scripts-disponibles)
- [Variables de Entorno Requeridas](#variables-de-entorno-requeridas)
- [Arquitectura](#arquitectura)
- [Seguridad](#seguridad)
- [Rutas del Dashboard](#rutas-del-dashboard)
- [Despliegue en Dokploy](#despliegue-en-dokploy)
- [Contribuir](#contribuir)
- [Comandos Útiles](#comandos-útiles)

## 📦 Inicio Rápido con Docker

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/whatsapp-agente.git
cd whatsapp-agente

# 2. Copiar variables de entorno
cp .env.example .env
# → Edita .env con tus credenciales

# 3. Generar ENCRYPTION_KEY (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Levantar todos los servicios
docker compose up -d

# La app estará disponible en http://localhost:3000
```

## 🔧 Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# → Edita .env.local

# 3. Levantar PostgreSQL y Redis
docker compose up postgres redis -d

# 4. Generar cliente Prisma y migrar BD
npm run db:migrate

# 5. Instalar hooks de Git (opcional pero recomendado)
npm run prepare

# 6. Iniciar servidor de desarrollo
npm run dev
```

## 📜 Scripts Disponibles

| Script                      | Descripción                                          |
| --------------------------- | ---------------------------------------------------- |
| `npm run dev`               | Inicia el servidor de desarrollo                     |
| `npm run build`             | Compila la aplicación para producción                |
| `npm run start`             | Inicia el servidor de producción                     |
| `npm run lint`              | Ejecuta ESLint para revisar el código                |
| `npm run lint:fix`          | Ejecuta ESLint y corrige errores automáticamente     |
| `npm run type-check`        | Verifica los tipos de TypeScript                     |
| `npm run format`            | Formatea el código con Prettier                      |
| `npm run format:check`      | Verifica que el código esté formateado correctamente |
| `npm run db:generate`       | Genera el cliente de Prisma                          |
| `npm run db:migrate`        | Ejecuta migraciones en desarrollo                    |
| `npm run db:migrate:deploy` | Ejecuta migraciones en producción                    |
| `npm run db:studio`         | Abre Prisma Studio                                   |
| `npm run db:reset`          | Reinicia la base de datos (desarrollo)               |
| `npm run prepare`           | Instala los hooks de Husky                           |

## 🌐 Variables de Entorno Requeridas

```env
# Base de datos
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_agente

# NextAuth
NEXTAUTH_SECRET=<min-32-chars>
NEXTAUTH_URL=http://localhost:3000

# Cifrado (64 hex chars = 32 bytes)
ENCRYPTION_KEY=<64-hex-chars>

# IA (al menos uno)
OPENAI_API_KEY=sk-...
ANTIGRAVITY_API_KEY=AIza...

# Google OAuth (para Calendar)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# URL pública de la app
NEXT_PUBLIC_APP_URL=https://tu-dominio.com

# Redis (opcional en desarrollo local)
REDIS_URL=redis://:redispass@localhost:6379
```

## 🏗️ Arquitectura

```
Cliente WhatsApp
      ↓
Meta Cloud API
      ↓
Webhook Next.js (/api/webhooks/whatsapp)
      ↓
Persistencia PostgreSQL (idempotencia, multi-tenant)
      ↓
Agente IA (OpenAI / Gemini / Custom)
      ↓
Google Calendar (disponibilidad + citas)
      ↓
Respuesta WhatsApp
```

## 🔒 Seguridad

- **AES-256-GCM**: Todos los tokens y API keys cifrados en BD
- **HMAC SHA256**: Validación de webhooks de WhatsApp
- **Rate Limiting**: Protección en endpoints de auth y webhook
- **CSRF**: Protección mediante NextAuth
- **Auditoría**: Registro de todos los eventos sensibles
- **Multi-tenant**: Aislamiento total por `organization_id`

## 📱 Rutas del Dashboard

| Ruta                   | Descripción                        |
| ---------------------- | ---------------------------------- |
| `/login`               | Inicio de sesión                   |
| `/signup`              | Registro de nueva organización     |
| `/dashboard`           | KPIs y métricas                    |
| `/conversaciones`      | Lista de conversaciones            |
| `/conversaciones/[id]` | Chat en tiempo real                |
| `/citas`               | Gestión de citas                   |
| `/personalizacion`     | Configuración del agente + Sandbox |
| `/integraciones`       | WhatsApp + Google Calendar + IA    |

## 🚢 Despliegue en Dokploy

1. Crear nuevo servicio en Dokploy → **Application**
2. Conectar repositorio de GitHub
3. Configurar las variables de entorno en **Project Environment**
4. Las migraciones se ejecutan automáticamente al iniciar el contenedor
5. El workflow de GitHub Actions hará push automático en cada commit a `main`

### Secrets requeridos en GitHub Actions

| Secret                | Descripción                          |
| --------------------- | ------------------------------------ |
| `DOKPLOY_TOKEN`       | Bearer token de la API de Dokploy    |
| `DOKPLOY_WEBHOOK_URL` | URL del webhook de deploy de Dokploy |

### Variables requeridas en GitHub Actions

| Variable     | Descripción                             |
| ------------ | --------------------------------------- |
| `DEPLOY_URL` | URL pública de la aplicación (opcional) |

## 🤝 Contribuir

1. Crea una rama desde `main`
2. Realiza tus cambios
3. Asegúrate de que el código pase todas las validaciones:
   ```bash
   npm run lint
   npm run type-check
   npm run format
   ```
4. Crea un Pull Request

Los hooks de Husky se ejecutarán automáticamente antes de cada commit para garantizar la calidad del código.

## 📋 Comandos Útiles

```bash
# Ver logs del contenedor
docker compose logs -f app

# Ejecutar migraciones manualmente
docker compose exec app npm run db:migrate:deploy

# Abrir Prisma Studio
npm run db:studio

# Reset de base de datos (desarrollo)
npm run db:reset

# Formatear todo el código
npm run format
```

## 📄 Licencia

MIT
