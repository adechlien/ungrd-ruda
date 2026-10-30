# UNGRD RUDA

Plataforma de captura de registros RUDA v8. La interfaz Angular, la API Express y PostgreSQL se ejecutan con Docker Compose. Esta guía cubre la ejecución local en desarrollo.

## Requisitos

- Git.
- Docker con contenedores Linux y Docker Compose **2.32 o posterior**. En Windows, iniciar Docker Desktop.

No es necesario instalar Node.js, npm ni PostgreSQL en el equipo; los contenedores incluyen las dependencias.

## Preparar el entorno

Los ejemplos usan PowerShell. Si ya se tiene el repositorio, entrar en su carpeta y omitir la clonación.

```powershell
git clone https://github.com/adechlien/ungrd-ruda.git
cd ungrd-ruda
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Abrir `.env` y asignar una contraseña propia a `PGPASSWORD`. No guardar archivos de credenciales en Git.

## Arrancar

```powershell
docker compose up --build --watch
```

Abrir **http://localhost:4305**. El primer arranque puede tardar mientras se descargan y construyen las imágenes.

Compose inicia PostgreSQL (`db`), ejecuta `db-init` y espera a que la API esté disponible antes de iniciar la interfaz. `db-init` crea directamente el esquema RUDA v8 en una base vacía y verifica las actualizaciones ya aplicadas. Es normal que termine con código `0`: es una tarea puntual. **No carga cuentas ni registros ficticios.**

La base nueva necesita una de las siguientes opciones para poder iniciar sesión. Ejecutar sus comandos desde otra terminal, en la misma carpeta del proyecto.

Cada funcionario consulta sus propios registros y reutiliza únicamente eventos que haya creado. Si un registro antiguo conserva un evento ajeno, seleccionar un evento propio o «Registrar un evento nuevo» en la sección Evento antes de guardarlo.

### Opción A: cuentas y registros de prueba

```powershell
docker compose run --rm seed
```

Iniciar sesión con `peter@example.com` o `gwen@example.com`, usando la contraseña **`RudaDemo2026!`**. `seed` prepara los catálogos y carga cuentas y registros ficticios. Solo se ejecuta cuando se solicita.

### Opción B: cuenta propia sin registros de prueba

```powershell
if (!(Test-Path .env.bootstrap)) { Copy-Item .env.bootstrap.example .env.bootstrap }
```

Completar en `.env.bootstrap` el correo, nombre, documento y contraseña de la cuenta. La contraseña debe tener al menos 12 caracteres. Después ejecutar:

```powershell
docker compose run --rm bootstrap
```

`bootstrap` prepara los catálogos y crea la cuenta indicada, sin registros ficticios. Si la cuenta ya existe, rechaza la operación sin cambiar sus credenciales. Retirar `.env.bootstrap` después de utilizarlo.

## Trabajar con cambios

Compose Watch sincroniza `src/` con la recarga de Angular. Los cambios en `public/` reinician la interfaz; los cambios en el servidor o el modelo compartido reinician la API y regeneran el contrato. Los cambios en dependencias reconstruyen las imágenes.

Si se añaden actualizaciones SQL, ejecutar `docker compose run --rm db-init` antes de seguir usando la API. No editar archivos SQL que ya se hayan aplicado.

Para ejecutar en segundo plano y activar la observación por separado:

```powershell
docker compose up --build -d --wait
docker compose watch
```

## Estado, registros y detención

```powershell
docker compose ps
docker compose logs --tail 100 api web db-init
docker compose stop
```

`stop` conserva los datos. `docker compose down` retira los contenedores y también conserva el volumen; **`docker compose down -v` elimina la base local**.

La contraseña de PostgreSQL se establece al inicializar el volumen. Cambiar `PGPASSWORD` en `.env` no cambia la contraseña de una base ya creada.

Si `db-init` detecta una instalación incompatible, se detiene sin modificarla. Para trabajar con una base nueva y conservar la anterior:

```powershell
docker compose -p ungrd-ruda-v8 up --build --watch
```

Mantener el mismo `-p ungrd-ruda-v8` en los comandos posteriores de ese entorno, incluidos `seed`, `bootstrap` y `stop`. Si ambos entornos se ejecutan a la vez, configurar un `WEB_PORT` y un `APP_ORIGIN` distintos para el segundo.

## Verificación

Con PostgreSQL encendido:

```powershell
docker compose run --rm --build test
```

El comando construye la aplicación y ejecuta las pruebas con una base temporal independiente. No utiliza los registros del entorno y elimina su base de pruebas al terminar.
