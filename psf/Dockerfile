# ----------------------------------------------------
# Etapa 1: Construcción del Frontend (Vue 3 + Vite)
# ----------------------------------------------------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package.json package-lock.json ./

# Instalar todas las dependencias para compilar
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar la aplicación frontend a /app/dist
RUN npm run build

# ----------------------------------------------------
# Etapa 2: Entorno de Producción (Node.js + Express)
# ----------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar manifiestos e instalar sólo dependencias de producción
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar el build del frontend desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Copiar el código del servidor y rutas
COPY src ./src
COPY routes ./routes
COPY db.js ./db.js

# Crear carpetas para almacenamiento de comandas y backups
RUN mkdir -p /app/backups /app/backups-pdf

EXPOSE 3000

# Comando de inicio del servidor Express
CMD ["node", "src/serverSQL.js"]
