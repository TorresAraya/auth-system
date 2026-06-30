# Auth System API

API REST de autenticación completa construida con Node.js, Express, PostgreSQL y Redis. Diseñada como módulo reutilizable y production-ready para cualquier aplicación.

🔗 **Live:** https://auth-system-production-acf7.up.railway.app

Usado como microservicio de autenticación por [LoL RAG Assistant](https://github.com/TorresAraya/lol-rag-assistant) — un asistente de IA con RAG que valida tokens JWT contra este servicio sin compartir secretos entre proyectos.

---

## Características

- Registro y login con email y contraseña
- Tokens JWT con access token (15min) y refresh token (7 días)
- Rotación automática de refresh token con blacklist en Redis
- Autenticación en dos factores (2FA) con TOTP compatible con Google Authenticator
- Control de roles granular (USER / ADMIN)
- Panel de administración de usuarios
- Audit log automático de todas las acciones sensibles
- Sesiones por dispositivo almacenadas en base de datos
- Rate limiting y protección con Helmet

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js |
| Framework | Express |
| Base de datos | PostgreSQL + Prisma ORM |
| Caché / Sesiones | Redis |
| Autenticación | JWT, bcrypt (saltRounds 12) |
| 2FA | speakeasy (TOTP), qrcode |
| Infraestructura | Docker, Railway |

---

## Instalación local

### Requisitos

- Node.js 18+
- Docker

### Pasos

```bash
# Clona el repositorio
git clone https://github.com/TorresAraya/auth-system.git
cd auth-system

# Instala dependencias
npm install

# Copia el archivo de variables de entorno
cp .env.example .env

# Levanta PostgreSQL y Redis
docker compose up -d

# Crea las tablas en la base de datos
npx prisma migrate dev

# Arranca el servidor
npm run dev
```

El servidor arranca en `http://localhost:3000`.

---

## Variables de entorno

```env
DATABASE_URL="postgresql://authuser:authpass@localhost:5432/authdb"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="tu_secret_aqui"
JWT_REFRESH_SECRET="tu_refresh_secret_aqui"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
```

---

## Endpoints

### Auth — público

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro con email y contraseña |
| POST | `/api/auth/login` | Login, devuelve access + refresh token |
| POST | `/api/auth/logout` | Invalida el refresh token |
| POST | `/api/auth/refresh` | Rota el refresh token y devuelve nuevo access token |

### Usuario — requiere token

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/user/me` | Datos del usuario autenticado |

### 2FA — requiere token

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/2fa/setup` | Genera QR para activar 2FA |
| POST | `/api/2fa/verify` | Verifica código TOTP y activa 2FA |
| POST | `/api/2fa/disable` | Desactiva 2FA |

### Admin — requiere rol ADMIN

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/users` | Lista todos los usuarios |
| PATCH | `/api/admin/users/:id/role` | Cambia el rol de un usuario |
| DELETE | `/api/admin/users/:id` | Elimina un usuario |
| GET | `/api/admin/audit-log` | Historial de acciones sensibles |

---

## Ejemplos de uso

### Registro

```bash
curl -X POST https://auth-system-production-acf7.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456","name":"John Doe"}'
```

### Login

```bash
curl -X POST https://auth-system-production-acf7.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'
```

### Ruta protegida

```bash
curl https://auth-system-production-acf7.up.railway.app/api/user/me \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

---

## Arquitectura

```
src/
├── controllers/       # Lógica de negocio
│   ├── auth.controller.js
│   ├── twoFactor.controller.js
│   └── admin.controller.js
├── middleware/        # Verificación de tokens y roles
│   └── auth.middleware.js
├── routes/            # Definición de endpoints
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── twofactor.routes.js
│   └── admin.routes.js
├── lib/               # Conexiones a servicios
│   ├── prisma.js
│   └── redis.js
└── index.js           # Entrada de la aplicación
```

---

## Decisiones técnicas

**¿Por qué access token corto (15min) + refresh token largo (7 días)?**
Minimiza la ventana de exposición si un access token se filtra, sin obligar al usuario a hacer login constantemente. La rotación del refresh token en cada uso añade una capa extra de seguridad.

**¿Por qué Redis para la blacklist?**
Los JWT son stateless por diseño. Redis permite invalidar tokens antes de su expiración de forma eficiente sin consultar PostgreSQL en cada request, con TTL automático que evita acumulación de datos.

**¿Por qué bcrypt con saltRounds 12?**
Con 12 rondas un hash tarda ~300ms en un servidor moderno, aceptable para el usuario pero prohibitivo para ataques de fuerza bruta automatizados.

**¿Por qué Prisma como ORM?**
Proporciona tipado, migraciones versionadas y una API de consulta expresiva que reduce errores y acelera el desarrollo sin sacrificar control sobre las queries.