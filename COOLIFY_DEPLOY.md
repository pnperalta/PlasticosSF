# Guía de Despliegue en Coolify — Plásticos SF

Esta guía detalla los pasos para desplegar el proyecto en **Coolify** con el dominio **`plasticos.sandboxtest.online`** y la importación automática de la base de datos `psf.sql`.

---

## 1. Arquitectura del Despliegue

El proyecto está preparado para desplegarse utilizando **Docker Compose**:
- **`app`**: Contenedor Node.js 22 (Debian slim) multi-stage que compila el frontend (Vue 3 + Vite) y levanta el servidor backend (Express en `src/serverSQL.js`). Escucha en el puerto `3000`.
- **`db`**: Contenedor MariaDB 10.4 que monta la carpeta `init-db/` con `01-init.sql` y `02-psf.sql` (`psf.sql`) para importar la base de datos automáticamente en su primer inicio.
- **Volúmenes persistentes**:
  - `db_data`: Guarda todos los registros de la base de datos.
  - `app_backups`: Guarda los archivos JSON de comandas.
  - `app_backups_pdf`: Guarda los archivos PDF generados.

---

## 2. Subir los cambios a GitHub / Git

Desde tu terminal local en la raíz del proyecto:

```bash
git add .
git commit -m "Configurar Docker, Docker Compose y preparar despliegue para Coolify"
git push origin main
```

---

## 3. Despliegue en Coolify

### Opción A: Desde Repositorio Git (Recomendada)
1. Entra a tu panel de **Coolify**.
2. Ve a tu **Project** -> **Environment** (ej: Production) -> **+ New Resource**.
3. Selecciona **Public Repository** o **Private Repository** (con tu cuenta de GitHub/GitLab).
4. Pega la URL de tu repositorio: `https://github.com/pnperalta/PlasticosSF` (o tu repo correspondiente) y la rama `main`.
5. En **Build Pack**, selecciona **Docker Compose**.
6. Coolify detectará automáticamente el archivo [docker-compose.yml](file:///home/nicolas/Documentos/pame/PlasticosSF/docker-compose.yml).
7. En la pestaña **Configuration** -> **Domains**:
   - Ingresa: `https://plasticos.sandboxtest.online`
   - Puerto mapeado: `3000`
8. En **Environment Variables** (opcional, si deseas cambiar contraseñas):
   ```env
   DB_HOST=db
   DB_PORT=3306
   DB_NAME=psf
   DB_USER=psf
   DB_PASSWORD=psf_password_segura
   DB_ROOT_PASSWORD=root_password_segura
   ```
9. Haz clic en **Deploy**.

---

### Opción B: Directo con Docker Compose en Coolify
1. En Coolify, crea un nuevo recurso seleccionando **Docker Compose**.
2. Pega el contenido de [docker-compose.yml](file:///home/nicolas/Documentos/pame/PlasticosSF/docker-compose.yml).
3. Configura el dominio `https://plasticos.sandboxtest.online`.
4. Haz clic en **Deploy**.

---

## 4. Verificación y DNS

1. Asegúrate de que el registro DNS de `plasticos.sandboxtest.online` apunte a la IP pública de tu servidor Coolify:
   - Tipo: `A`
   - Nombre / Host: `plasticos`
   - Valor: `<IP_DE_TU_SERVIDOR_COOLIFY>`
2. Una vez desplegado, Coolify gestionará automáticamente el certificado SSL (Let's Encrypt).
3. Entra a `https://plasticos.sandboxtest.online` en tu navegador.
