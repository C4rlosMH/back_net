# Miranda Net | Backend

Plataforma completa para la gestión, administración y automatización de un Proveedor de Servicios de Internet. Este repositorio principal orquesta tanto la interfaz de usuario (Frontend) como la API y base de datos (Backend) utilizando contenedores de Docker.

---

## Requisitos Previos

Para desplegar este sistema, tu servidor o computadora solo necesita tener instalado:

* **Docker**
* **Docker Compose**

> **Nota:** No es necesario instalar Node.js, NPM, ni MySQL directamente en el sistema operativo host.

---

## Estructura de Directorios

Asegúrate de que tus carpetas estén organizadas de la siguiente manera:

```text
/ (Carpeta Raíz)
 ├── back_net/               # Código fuente del Backend (Node.js)
 │    ├── Dockerfile
 │    ├── .env
 │    └── ...
 ├── front_net/              # Código fuente del Frontend (React/Vite)
 │    ├── Dockerfile
 │    ├── .env
 │    └── ...
 └── docker-compose.yml      # Archivo de orquestación de Docker
```

---

## Configuración Inicial

Antes de levantar el sistema, debes configurar las variables de entorno para que los contenedores puedan comunicarse.

### 1. Variables del Backend
Crea un archivo llamado `.env` dentro de la carpeta `back_net/` con la configuración de conexión:

```env
PORT=4000
DB_HOST=mysql-db
DB_PORT=3306  #Cambiar de ser necesario por el puerto de la BD
DB_USER=app_user #Se recomienda usar un usuario exclusivo para el uso del sistema, no usar el usuario ROOT
DB_PASSWORD=tu_password_segura #Usar la password del usuario del sistema, no el ROOT
DB_NAME=mi_db #Cambiar por el nombre de la base de datos
JWT_SECRET=tu_secreto_jwt #Cambiar por una password más segura
FRONTEND_URL=[http://192.168.1.](http://192.168.1.)XX:5000  #Apuntar a la IP de la maquina o del Frontend
```

### 2. Variables del Frontend
Crea un archivo llamado `.env` dentro de la carpeta `front_net/`. Es vital que la IP coincida con la de la máquina host en la red local:

```env
VITE_API_URL=[http://192.168.1.](http://192.168.1.)XX:4000/api
```

> **Importante:** Reemplaza `192.168.1.XX` por la IP local real del servidor antes de ejecutar la construcción.

---

## Guía de Despliegue

Abre una terminal en esta carpeta raíz (donde se encuentra el archivo `docker-compose.yml`) y ejecuta el siguiente comando para construir las imágenes y levantar los contenedores en segundo plano:

```bash
docker-compose up -d --build
```

El sistema descargará MySQL, configurará la base de datos, levantará la API de Node.js en el puerto `4000` y construirá los archivos estáticos de React para servirlos en el puerto `5000`.

Una vez finalizado, puedes acceder al sistema desde cualquier dispositivo en tu red local ingresando a:  
**`http://192.168.1.XX:5000`**

---

## Comandos de Mantenimiento

A continuación, una lista de comandos útiles para administrar el estado de los contenedores desde la carpeta raíz:

* **Ver el estado de los servicios:**
  ```bash
  docker-compose ps
  ```

* **Ver registros (Logs) del backend en tiempo real:**
  ```bash
  docker-compose logs -f backend
  ```

* **Ver registros del frontend:**
  ```bash
  docker-compose logs -f frontend
  ```

* **Reiniciar todo el sistema:**
  ```bash
  docker-compose restart
  ```

* **Detener el sistema temporalmente (los datos se conservan):**
  ```bash
  docker-compose down
  ```

* **Detener el sistema y destruir la base de datos de forma permanente:**
  ```bash
  docker-compose down -v
  ```
