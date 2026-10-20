# Manual de sistema — RUDA v8

Fecha de actualización: 20 de octubre de 2026. Dirigido a desarrolladores y responsables de instalación, soporte y operación de la demostración.

## 1. Propósito y referencia funcional

El sistema permite a funcionarios capturar declaraciones, guardar borradores, terminar registros, consultar eventos y visualizar estadísticas de sus propias capturas. La demostración utiliza información ficticia.

La fuente oficial es [RUDAM_F002_v8.xlsx](RUDAM_F002_v8.xlsx). La revisión del modelo es **8**; la portada del documento identifica el formato **F-RUDA-001, versión 5**. Estos valores no deben confundirse con `version_registro`, que aumenta con cada guardado para controlar la concurrencia.

Documentación relacionada:

- [Modelo físico oficial](modelo-ruda-v8.dbml).
- [Modelo entidad–relación](modelo-er.md).
- [Casos de uso](use-cases.md).
- [Manual de usuario](user-guide.md).
- [Informe de pruebas previas a Vercel](pruebas-previas-vercel.md).

El programa registra datos de certificación y seguimiento, pero no expide certificaciones ni ejecuta trámites ante servicios externos. No incluye una interfaz de administración de cuentas ni recuperación de contraseñas.

## 2. Arquitectura y componentes

| Componente | Implementación y responsabilidad |
| --- | --- |
| Interfaz | Angular 21, TypeScript y Tailwind CSS. Captura y consulta de información. |
| API | Express 5 sobre Node.js 24. Autenticación, autorización, validación y persistencia. |
| Base de datos | PostgreSQL; el entorno local usa PostgreSQL 17 en Docker. |
| Contrato compartido | Reglas utilizadas por el cliente y el servidor para validar RUDA v8. |
| Archivos | Acta o comunicado almacenado como contenido binario en la base de datos. |
| Despliegue previsto | Frontend estático y función de API en Vercel; PostgreSQL externo en Neon. |

En desarrollo, Angular recibe las solicitudes del navegador y redirige `/api` a Express mediante `proxy.conf.json`. En Vercel, las reescrituras de `vercel.json` dirigen `/api/*` al adaptador `api/index.mjs` y las rutas de la interfaz a `index.html`.

### Archivos principales

| Ruta desde la raíz | Uso |
| --- | --- |
| `src/app/form-schema.ts` | Preguntas, numeración y catálogos del formulario v8. |
| `src/app/form-contract.ts` | Reglas compartidas y validación de la captura. |
| `src/app/app.ts` | Navegación, edición, guardado y manejo de archivos en la interfaz. |
| `server/build-contract.cjs` | Genera el contrato ejecutable del servidor. |
| `server/generated/contract.mjs` | Archivo generado; no se edita manualmente. |
| `server/app.mjs` | Aplicación Express y rutas de API. |
| `server/index.mjs` | Inicio del servidor local. |
| `api/index.mjs` | Exportación de Express para Vercel. |
| `server/repository-v8.mjs` | Operaciones de persistencia del modelo activo. |
| `server/acta.mjs` | Validación y almacenamiento de actas. |
| `server/db.mjs` | Conexión y transacciones de PostgreSQL. |
| `server/migrate.mjs` / `server/seed.mjs` | Migraciones y datos ficticios iniciales. |
| `compose.yaml` / `vercel.json` | Configuración local de PostgreSQL y configuración de despliegue. |

## 3. Requisitos e instalación local

Se necesitan Node.js 24, npm, Docker Desktop en ejecución y acceso a una terminal. Ejecutar los comandos desde la raíz del proyecto.

1. Instalar dependencias con `npm ci` cuando se conserve el archivo `package-lock.json`.
2. Si no existe `.env`, copiar `.env.example` como `.env`. Conservar la configuración existente si ya funciona.
3. Asignar una contraseña local y revisar las variables de conexión.
4. Iniciar la base y preparar el esquema:

```powershell
npm run db:up
docker compose ps
npm run db:migrate
npm run db:seed
```

Esperar a que el servicio de base de datos esté saludable antes de migrar. El seed se utiliza para preparar la demostración; no es necesario ejecutarlo en cada arranque.

En una terminal, iniciar la API:

```powershell
npm run api
```

En otra terminal, iniciar la interfaz:

```powershell
npm start
```

| Servicio | Dirección local |
| --- | --- |
| Aplicación | `http://127.0.0.1:4305` |
| API | `http://127.0.0.1:4310/api` |
| Comprobación de conexión | `http://127.0.0.1:4310/api/health` |
| PostgreSQL | `127.0.0.1:54321` |

Utilizar la aplicación desde la dirección de Angular. La interfaz y la API se comunican mediante el proxy para mantener las cookies en el mismo origen.

### Variables de entorno

| Variable | Uso |
| --- | --- |
| `PGHOST` | Servidor de PostgreSQL local; ejemplo: `127.0.0.1`. |
| `PGPORT` | Puerto local; el Compose incluido publica `54321`. |
| `PGDATABASE` | Base de datos; ejemplo: `ruda`. |
| `PGUSER` | Usuario de conexión; ejemplo: `ruda`. |
| `PGPASSWORD` | Contraseña de la base. No publicar su valor. |
| `API_PORT` | Puerto del servidor local; predeterminado: `4310`. |
| `DATABASE_URL` | Cadena de conexión del backend desplegado. Tiene prioridad sobre `POSTGRES_URL`. |
| `POSTGRES_URL` | Alternativa de cadena de conexión si no existe `DATABASE_URL`. |
| `APP_ORIGIN` | Orígenes adicionales admitidos, separados por comas, con protocolo y sin rutas. |
| `NODE_ENV` | En producción activa cookies seguras. |
| `VERCEL`, `VERCEL_URL`, `VERCEL_BRANCH_URL` | Variables del entorno Vercel usadas para el proxy, cookies y orígenes admitidos. |

Si se define una URL de conexión, comprobar que apunta al entorno deseado antes de migrar o cargar ejemplos. El archivo `.env` pertenece al backend; sus valores no deben incorporarse al código del navegador ni a la documentación pública.

### Cuentas de demostración

El seed prepara `peter@example.com` y `gwen@example.com`, ambas con contraseña de demostración `RudaDemo2026!`. Son cuentas para pruebas con datos ficticios. No utilizar estas credenciales para una operación con datos reales.

En una base nueva se generan ejemplos para los dos funcionarios. Si un funcionario ya tiene registros, el seed no reemplaza sus capturas con ejemplos nuevos. La cantidad resultante depende, por tanto, del estado previo de la base.

## 4. Persistencia, migraciones y trazabilidad

El DBML v8 es la referencia física del modelo de negocio. Las tablas normalizadas representan declaraciones, hogares, integrantes, eventos, bienes, información económica, salud y módulo étnico. `auditoria_registro` conserva una captura de respuestas por versión, incluidos borradores incompletos. `archivo_registro` conserva el acta vigente.

El guardado de la captura, sus dependencias y su versión de auditoría ocurre en una transacción. El cliente envía la versión que conoce; una versión antigua produce un conflicto para evitar que una sesión sobrescriba cambios de otra.

Las migraciones **010** y **011** activan el modelo v8 y el almacenamiento de archivos. La transición conserva los datos anteriores en `ruda_legacy_v7`, mantiene los identificadores de registros y transforma la información histórica. Los registros terminados que no cumplen los requisitos nuevos vuelven a borrador para revisión. Esto no equivale a perder el registro.

En la base de trabajo revisada se conservaron 28 registros; 17 previamente terminados necesitaron completar información v8. Estas cifras describen esa base, no una condición necesaria para instalar el sistema.

Las migraciones verifican su integridad. **No editar migraciones aplicadas ni sus auxiliares incluidos en las sumas de comprobación**; incorporar los cambios posteriores mediante nuevas migraciones. Antes de una actualización, respaldar la base y revisar el destino de conexión.

## 5. Reglas operativas relevantes

- Solo está habilitado el modo claro. Dark y System se muestran deshabilitados.
- Guardar un borrador requiere un documento válido; terminar exige los campos obligatorios aplicables y la revisión de los integrantes.
- Segundo apellido obligatorio; demás nombres opcional. Narración obligatoria sin longitud mínima de 300 caracteres; preguntas guía opcionales.
- El catálogo de eventos depende de su tipo. Mixto combina los eventos disponibles; Por determinar permite Otro.
- Fechas de nacimiento reales y no futuras, dentro del rango admitido de 130 años. Los valores numéricos también se validan en el servidor.
- Los municipios deben corresponder con el departamento seleccionado.
- El módulo étnico-colectivo y otros detalles condicionales se validan cuando aplican.
- El porcentaje de respuestas incluye campos opcionales y no determina por sí solo si se puede terminar.
- Cada funcionario accede a sus registros, historial y archivos. La consulta de eventos se construye a partir de sus registros terminados.
- Los eventos pueden compartirse entre capturas; una edición no debe alterar la información de otras declaraciones asociadas.

### Acta o comunicado

Se admite un archivo vigente por registro, en formato PDF, PNG o JPEG, de hasta **4 MiB (4.194.304 bytes)**; la interfaz lo expresa como 4 MB. El servidor comprueba también el contenido del archivo. Una nueva carga reemplaza el archivo vigente; es posible descargarlo o retirarlo. El guardado ordinario del formulario conserva el adjunto.

El archivo se almacena en PostgreSQL, sin depender del disco temporal de la función desplegada. Las copias de seguridad de la base deben incluirlo. La auditoría de respuestas no debe interpretarse como un archivo histórico de todas las versiones del adjunto.

## 6. Autenticación y API

Las contraseñas se verifican mediante hashes; la sesión usa un token aleatorio cuyo hash se conserva en la base de datos. La cookie `ruda_session` tiene duración de ocho horas, ruta `/api`, `HttpOnly` y `SameSite=Strict`; en producción se marca `Secure` y requiere HTTPS.

Las operaciones de escritura comprueban el origen cuando el navegador envía ese encabezado. Los orígenes de desarrollo están configurados en el servidor; los dominios adicionales se declaran en `APP_ORIGIN`. El límite de intentos de acceso se mantiene en memoria por instancia: no constituye un contador distribuido entre funciones de Vercel.

| Método y ruta | Operación |
| --- | --- |
| `GET /api/health` | Comprobar la conexión a la base; acceso público. |
| `POST /api/auth/login` | Iniciar sesión con `email` y `password`; acceso público. |
| `GET /api/auth/me` | Obtener la cuenta autenticada. |
| `POST /api/auth/logout` | Cerrar la sesión actual. |
| `GET /api/forms` | Listar registros del funcionario. |
| `GET /api/events` | Consultar los eventos visibles para el funcionario. |
| `PUT /api/forms/:id` | Guardar una captura como borrador o actualizarla. |
| `POST /api/forms/:id/finish` | Validar y terminar una captura. |
| `GET /api/forms/:id/history` | Consultar las versiones del registro propio. |
| `PUT /api/forms/:id/acta?nombre=...` | Cargar el archivo con cuerpo binario `application/octet-stream`. |
| `GET /api/forms/:id/acta` | Descargar el archivo vigente. |
| `DELETE /api/forms/:id/acta` | Retirar el archivo vigente. |

Salvo las dos rutas indicadas como públicas, las rutas requieren una sesión válida. Los errores devuelven un mensaje y, cuando corresponde, una lista de problemas de validación. La interfaz no incorpora una pantalla de consulta del historial técnico.

## 7. Verificación antes de publicar

```powershell
npm test
npm run test:api
npm run test:predeploy
```

`npm test` verifica el contrato compartido y las estadísticas. `test:api` crea una base temporal local, ejecuta migraciones y seed dos veces, prueba los flujos del servidor y elimina la base temporal al finalizar. Requiere PostgreSQL local y permiso para crear bases; no se debe apuntar a una base remota para estas pruebas.

`test:predeploy` añade la compilación y las pruebas del adaptador en modo producción. La última ejecución documentada aprobó **33 pruebas sin fallos**. El [informe de pruebas](pruebas-previas-vercel.md) describe la cobertura automática, la revisión en navegador y los límites pendientes. Un resultado local correcto no acredita por sí solo el funcionamiento en Neon o en la URL HTTPS final.

## 8. Preparación del despliegue en Vercel y Neon

La configuración del repositorio genera el contrato compartido y la aplicación con `npm run build:vercel`. La salida del frontend es `dist/ruda-web/browser`; la API se exporta desde `api/index.mjs`. El build **no ejecuta migraciones ni seed**.

Procedimiento para preparar una demostración:

1. Crear una base de PostgreSQL dedicada a la prueba en Neon y obtener su conexión con pooling y TLS.
2. Configurar `DATABASE_URL` como variable del backend en los entornos de Vercel que se utilizarán. Mantener los secretos fuera del repositorio.
3. Si se utiliza un dominio personalizado, añadir su origen HTTPS exacto en `APP_ORIGIN`. Los dominios de despliegue y rama proporcionados por las variables de Vercel también se contemplan en el código.
4. Desde un entorno controlado con la conexión de esa base, ejecutar `npm run db:migrate` y, para cargar la demostración, `npm run db:seed`. Revisar el destino antes de ejecutar ambos comandos.
5. Publicar con la configuración incluida y comprobar `/api/health` sobre HTTPS.
6. Probar inicio y cierre de sesión, aislamiento entre los dos funcionarios, crear/guardar/reabrir/terminar un registro, estadísticas y carga/descarga de un acta.
7. Verificar que recargar una ruta interna conserva el acceso a la aplicación y que las cookies funcionan en el dominio final.

Las pruebas de la URL desplegada y la conexión real con Neon quedan pendientes hasta disponer de ese entorno. Este manual no presupone un plan comercial ni una cuota gratuita específica; revisar las condiciones de las cuentas elegidas antes de publicar. El entorno actual es de demostración con información ficticia.

## 9. Operación y respaldo

Para detener el entorno local, finalizar los procesos de Angular y Express con `Ctrl+C` en sus terminales y detener PostgreSQL:

```powershell
docker compose stop db
```

Los datos permanecen en el volumen `ruda_pgdata`. Eliminar ese volumen elimina la base local; no usar esa operación como procedimiento de reinicio.

### Copia local de la base

Con los valores de ejemplo `PGUSER=ruda` y `PGDATABASE=ruda`, los siguientes comandos crean un respaldo con formato PostgreSQL y lo copian al equipo. Ajustar usuario y base si la instalación usa otros valores. Elegir un nombre distinto para cada respaldo.

```powershell
New-Item -ItemType Directory -Force backups
docker compose exec -T db pg_dump -U ruda -d ruda -Fc -f /tmp/ruda-backup.dump
docker compose cp db:/tmp/ruda-backup.dump ./backups/ruda-backup.dump
```

Comprobar que ambos comandos Docker terminan correctamente y que el archivo fue copiado. No redirigir una copia binaria mediante `>` en PowerShell. Proteger los respaldos, ya que incluyen respuestas, archivos y datos de cuentas. Verificar periódicamente la restauración en una base separada y vacía mediante herramientas PostgreSQL, antes de confiar en la copia para recuperación. Para Neon, adaptar el respaldo a la conexión remota y a las herramientas disponibles en ese entorno.

Durante una actualización: respaldar, instalar las dependencias correspondientes, aplicar únicamente las migraciones nuevas, compilar, reiniciar la API y comprobar acceso y guardado. Recargar el navegador para utilizar el contrato v8 vigente.

Los errores locales aparecen en la terminal de la API; en Vercel deben revisarse los registros de ejecución de la función. Al reportar incidencias, registrar la hora, operación, código HTTP y mensaje, evitando copiar contraseñas, cookies o cadenas de conexión.

## 10. Diagnóstico de incidencias

| Síntoma | Comprobación y acción |
| --- | --- |
| API sin conexión a la base | Revisar Docker, salud del servicio, puerto y variables; en remoto, revisar la URL y TLS. |
| Tablas inexistentes | Verificar la base seleccionada y ejecutar las migraciones pendientes. |
| Contrato generado ausente | Ejecutar `npm run contract:build`; los comandos normales de API y migración ya lo incluyen. |
| Puerto ocupado | Identificar el servicio que ocupa 4305 o 4310; si cambia el puerto de API, ajustar también el proxy de desarrollo. |
| HTTP 401 | Credenciales incorrectas, sesión vencida o cookie ausente; volver a iniciar sesión. |
| HTTP 403 por origen | Revisar el dominio exacto y `APP_ORIGIN`; evitar orígenes con rutas o una barra final. |
| HTTP 409 | Conflicto de versión o cliente desactualizado; conservar los cambios relevantes y recargar el registro. |
| HTTP 413 | Archivo o solicitud demasiado grande; reducir el archivo a un máximo de 4 MiB. |
| HTTP 422 | Revisar los problemas devueltos: obligatoriedad, formatos, catálogos, municipios o valores únicos. |
| HTTP 429 | Esperar un minuto antes de volver a intentar el inicio de sesión. |
| HTTP 500 | Revisar los registros del servidor y la conexión; el mensaje al usuario no expone el error interno. |
| Registro terminado que aparece en borrador | Comprobar si requiere completar requisitos v8 o si una edición dejó de cumplir las validaciones. |

Ante un fallo de migración, revisar primero el error y el destino de conexión. No borrar datos ni modificar sumas de comprobación para forzar su ejecución.
