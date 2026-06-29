# Auth System API

API REST de autenticación completa construida con Node.js, JWT, bcrypt y Redis. Diseñada como módulo reutilizable para cualquier aplicación.

## Características

- Registro y login con email y contraseña
- Tokens JWT con access token (15min) y refresh token (7 días)
- Rotación automática de refresh token
- Blacklist de tokens en Redis
- Autenticación en dos factores (2FA) con TOTP
- Control de roles (USER / ADMIN)
- Panel de administración de usuarios
- Audit log automático de acciones sensibles
- Sesiones por dispositivo en base de datos

## Tecnologías

- **Runtime:** Node.js
- **Framework:** Express
- **Base de datos:** PostgreSQL + Prisma ORM
- **Caché / Sesiones:** Redis
- **Autenticación:** JWT, bcrypt
- **2FA:** speakeasy (TOTP), qrcode
- **Infraestructura:** Docker

## Instalación

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

## Variables de entorno

Crea un archivo `.env` con los siguientes valores:

```env
DATABASE_URL="postgresql://authuser:authpass@localhost:5432/authdb"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="tu_secret_aqui"
JWT_REFRESH_SECRET="tu_refresh_secret_aqui"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
```

## Endpoints

### Auth

| Método | Ruta 	        | Descripción 	       | Auth |
|--------|----------------------|----------------------|------|
| POST   | `/api/auth/register` | Registro de usuario  | No   |
| POST   | `/api/auth/login`    | Login                | No   |
| POST   | `/api/auth/logout`   | Cerrar sesión        | No   |
| POST   | `/api/auth/refresh`  | Renovar access token | No   |

### Usuario

| Método | Ruta 	  | Descripción 	     | Auth |
|--------|----------------|--------------------------|------|
| GET 	 | `/api/user/me` | Datos del usuario actual | Sí   |

### 2FA

| Método | Ruta 	      | Descripción 		       | Auth |
|--------|--------------------|--------------------------------|------|
| POST   | `/api/2fa/setup`   | Generar QR para activar 2FA    | Sí   |
| POST   | `/api/2fa/verify`  | Verificar código y activar 2FA | Sí   |
| POST   | `/api/2fa/disable` | Desactivar 2FA                 | Sí   |

### Admin

| Método | Ruta 		       | Descripción 		   | Auth  |
|--------|-----------------------------|---------------------------|-------|
| GET    | `/api/admin/users` 	       | Listar todos los usuarios | ADMIN |
| PATCH  | `/api/admin/users/:id/role` | Cambiar rol de usuario    | ADMIN |
| DELETE | `/api/admin/users/:id`      | Eliminar usuario 	   | ADMIN |
| GET    | `/api/admin/audit-log`      | Ver audit log 		   | ADMIN |

## Ejemplos de uso

### Registro

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456","name":"John Doe"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'
```

### Ruta protegida

```bash
curl http://localhost:3000/api/user/me \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

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
│   ├── twoFactor.routes.js
│   └── admin.routes.js
├── lib/               # Conexiones a servicios
│   ├── prisma.js
│   └── redis.js
└── index.js           # Entrada de la aplicación
```

## Decisiones técnicas

**¿Por qué access token corto (15min) + refresh token largo (7 días)?**
Minimiza la ventana de exposición si un access token se filtra, sin obligar al usuario a hacer login constantemente.

**¿Por qué Redis para la blacklist?**
Los JWT son stateless por diseño. Redis permite invalidar tokens antes de su expiración de forma eficiente sin consultar PostgreSQL en cada request.

**¿Por qué bcrypt con saltRounds 12?**
Con 12 rondas un hash tarda ~300ms, aceptable para el usuario pero prohibitivo para ataques de fuerza bruta.