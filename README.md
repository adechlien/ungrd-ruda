# RUDA v8

La referencia oficial de este proyecto es [RUDAM_F002_v8.xlsx](docs/RUDAM_F002_v8.xlsx), conservada sin modificaciones. La revisión del archivo es 8; su portada indica formato F-RUDA-001, versión 5. La aplicación usa Angular, una API Express y PostgreSQL 17.

## Modelo y documentación

- [Modelo físico oficial DBML](docs/modelo-ruda-v8.dbml).
- [Modelo entidad–relación](docs/modelo-er.md).
- [Modelo ER completo en PNG](docs/diagramas/modelo-er.png).
- [Casos de uso](docs/use-cases.md).
- [Diagrama de casos de uso en PNG](docs/diagramas/casos-de-uso.png).
- [Manual de sistema](docs/system-manual.md).
- [Manual de usuario](docs/user-guide.md).
- [Resultados de pruebas previas a Vercel](docs/pruebas-previas-vercel.md).

Los DBML anteriores son antecedentes. El modelo activo usa registro, registro_declarante, tipo_evento, evento_principal y evento_especifico. Las tablas normalizadas contienen la información operativa y auditoria_registro conserva una captura por versión, incluidos borradores incompletos.

## Ejecutar en local por primera vez

Requisitos: Git, Node.js **24.x**, npm y Docker Desktop en ejecución con contenedores Linux. No hace falta instalar Angular CLI ni PostgreSQL de forma global. El repositorio es privado: la persona que lo clone necesita acceso de colaboradora y autenticarse en GitHub.

Los ejemplos siguientes usan PowerShell. Ejecutar todos los comandos desde la raíz del proyecto, donde está `package.json`.

### 1. Clonar e instalar dependencias

```powershell
git clone https://github.com/adechlien/ungrd-ruda.git
cd ungrd-ruda
npm ci
```

`npm ci` utiliza las versiones de `package-lock.json`. Si se añade o actualiza una dependencia durante el desarrollo, usar `npm install` y guardar también el cambio del lockfile.

### 2. Configurar la base local

Crear `.env` a partir del ejemplo únicamente si todavía no existe:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Abrir `.env` y mantener esta configuración, asignando una contraseña local propia antes del primer arranque:

```dotenv
PGHOST=127.0.0.1
PGPORT=54321
PGDATABASE=ruda
PGUSER=ruda
PGPASSWORD=define-una-clave-local
API_PORT=4310
```

Docker y la API leen el mismo archivo. La contraseña se configura al crear la base por primera vez; cambiarla después en `.env` no modifica la contraseña de un volumen que ya existe.

Para trabajar con la base de tu equipo, dejar `DATABASE_URL` y `POSTGRES_URL` sin definir, también en las variables de la terminal: tienen prioridad sobre la conexión local. Cada instalación local tiene su propia base; sus cambios no afectan a Neon ni a otros equipos. `.env` está excluido de Git y no se debe subir.

### 3. Crear el esquema y los datos de demostración

```powershell
npm run db:up
docker compose ps
```

Esperar a que `db` aparezca como `healthy`. Después ejecutar:

```powershell
npm run db:migrate
npm run db:seed
```

Las migraciones crean el esquema y el seed prepara las dos cuentas y registros ficticios. Las credenciales para copiar están en [Ingresar y salir del manual de usuario](docs/user-guide.md#2-ingresar-y-salir).

Clonar el repositorio no copia la base de otro equipo ni sus registros actuales. El seed genera ejemplos; para reproducir exactamente una base existente hace falta un respaldo y su restauración, según el [manual de sistema](docs/system-manual.md).

### 4. Iniciar API e interfaz en terminales separadas

En la primera terminal, desde la raíz del proyecto:

```powershell
npm run api
```

En una segunda terminal, también desde la raíz:

```powershell
npm start
```

Mantener ambas terminales abiertas y entrar en **http://127.0.0.1:4305**.

| Servicio | Dirección local |
| --- | --- |
| Interfaz de desarrollo | `http://127.0.0.1:4305` |
| API | `http://127.0.0.1:4310/api` |
| Comprobación de conexión a la base | `http://127.0.0.1:4310/api/health` |
| PostgreSQL | `127.0.0.1:54321` |

Angular redirige `/api` al servidor mediante `proxy.conf.json`, conservando el mismo origen para las cookies. El puerto 4315 usado en algunas revisiones de este proyecto es una vista temporal; no forma parte del arranque habitual.

## Hacer cambios durante el desarrollo

| Qué se quiere cambiar | Archivos principales |
| --- | --- |
| Pantalla principal, acceso y navegación | `src/app/app.html` y `src/app/app.ts` |
| Estilos y comportamiento responsive | `src/styles.css` y clases de las plantillas |
| Preguntas y catálogos RUDA v8 | `src/app/form-schema.ts` |
| Reglas y validación compartida | `src/app/form-contract.ts` |
| Captura del formulario | `src/app/form/` |
| Listado y estadísticas | `src/app/dashboard/` |
| API y archivos adjuntos | `server/app.mjs` y `server/acta.mjs` |
| Persistencia del modelo activo | `server/repository-v8.mjs` |
| Cambios de esquema | Nuevas migraciones en `server/migrations/` |

La interfaz se recompila automáticamente con `npm start`. Si se modifica el backend, detener la API con `Ctrl+C` y volver a ejecutar `npm run api`. Ese comando también regenera el contrato compartido: reiniciar la API después de cambiar preguntas o validaciones compartidas. No editar `server/generated/contract.mjs` manualmente.

No modificar migraciones ya aplicadas ni los auxiliares que participan en sus sumas de comprobación. Añadir migraciones nuevas y ejecutarlas con `npm run db:migrate`. Mantener el DBML y la documentación acordes con los cambios de esquema.

Antes de compartir cambios, ejecutar:

```powershell
npm test
npm run build
```

Si se modifica la API, persistencia o migraciones, ejecutar además `npm run test:api`. Para revisar el conjunto previo al despliegue, usar `npm run test:predeploy`; ambas comprobaciones de integración necesitan PostgreSQL local y crean bases de prueba aisladas.

## Volver a arrancar y detener el entorno

Después de la primera instalación basta con `npm run db:up`, `npm run api` y `npm start`, manteniendo API e interfaz en terminales separadas. Si se recibieron migraciones nuevas, aplicarlas antes de iniciar la API. No es necesario volver a cargar los ejemplos en cada arranque.

Para detenerlo, usar `Ctrl+C` en las dos terminales y ejecutar:

```powershell
docker compose stop db
```

El volumen conserva los registros entre reinicios. No eliminarlo para reiniciar la aplicación.

### Problemas frecuentes al empezar

- **No se puede clonar:** comprobar el acceso al repositorio privado y la cuenta de GitHub utilizada.
- **Docker no responde:** abrir Docker Desktop y esperar a que su motor esté listo.
- **La API no conecta:** comprobar que `db` está saludable, que `.env` coincide con la base y que no hay una URL remota definida en la terminal.
- **Faltan tablas:** ejecutar `npm run db:migrate` contra la base local correcta.
- **El listado está vacío en una base nueva:** ejecutar `npm run db:seed` y entrar con una cuenta de demostración.
- **Puerto ocupado:** comprobar los puertos 4305, 4310 y 54321. Si se cambian, ajustar también el proxy o la publicación de Docker que corresponda.
- **No aparece el cambio del backend:** reiniciar `npm run api`; no tiene recarga automática.

## Datos y transición a v8

Las migraciones 010 y 011 activan v8 y el almacenamiento de actas. La 010 conserva íntegros los datos anteriores en el esquema ruda_legacy_v7, transforma las respuestas históricas y conserva los UUID de registros, funcionarios, cuentas y eventos. Los registros terminados que no cumplen los campos obligatorios de v8 vuelven a borrador; no se inventan apellidos ni fechas. La transición añade una versión de auditoría por registro.

En la base local se conservaron 28 registros y su historial. De ellos, 17 antes terminados requieren completar información v8 y pasaron a borrador.

El seed crea cuentas y ejemplos ficticios cuando el funcionario todavía no tiene registros. No reemplaza capturas existentes. Las cuentas de demostración y su contraseña están en el [manual de usuario](docs/user-guide.md#2-ingresar-y-salir). Los registros y sesiones persisten en PostgreSQL. No eliminar el volumen de Docker si se desean conservar.

## Reglas del formulario

- Solo modo claro; Dark y System están visibles pero deshabilitados.
- El segundo apellido es obligatorio al terminar; demás nombres es opcional.
- La narración es obligatoria sin mínimo de 300 caracteres. Las preguntas guía son opcionales y admiten texto libre.
- Las preguntas 35–38 corresponden a certificación; 39–52 a desplazamiento; el módulo étnico termina en la 90.
- El catálogo de eventos principales depende del tipo de evento. Mixto usa la unión y Por determinar ofrece Otro.
- Un borrador requiere un documento válido. El cierre valida los campos obligatorios aplicables, integrantes y municipios.
- Unidades productivas y detalles condicionales se habilitan según las respuestas. Animales e inmuebles/muebles permiten varios registros por hogar.
- Los eventos pueden compartirse; editar una captura no modifica las demás. Cada funcionario accede únicamente a sus registros y archivos.
- El acta o comunicado admite PDF/PNG/JPG de hasta 4 MB, almacenado en PostgreSQL. Puede cargarse, descargarse, reemplazarse o retirarse; persiste entre guardados del formulario.
- Guardar actualiza registro, dependencias e historial en una transacción. Una versión antigua se rechaza para evitar sobrescribir cambios de otra sesión.
- Un cliente anterior a revisión 8 debe recargar la página antes de guardar.

## Verificación

- npm run build: compilación de producción.
- npm run test:contract: contrato del formulario, estadísticas, numeración v8 y conversión histórica.
- npm test: pruebas del contrato compartido.
- npm run test:api: crea una base local aislada, ejecuta migraciones y seed, comprueba su repetición y ejecuta las pruebas; elimina esa base temporal al finalizar.
- npm run test:predeploy: añade la compilación para Vercel y las pruebas del handler en modo producción. Requiere Node.js y PostgreSQL local con permiso de crear bases de prueba.

La migración se comprobó primero en una copia aislada de la base local. Se verificaron conservación de registros e historial, autenticación, aislamiento, guardado de borradores, cierre y atomicidad, conflictos de versión, eventos compartidos, animales y bienes repetidos, y archivos de acta.

## Despliegue

La configuración está preparada en vercel.json y api/index.mjs. El build genera el contrato compartido y el frontend; no ejecuta migraciones ni inserta datos. Definir DATABASE_URL con la conexión de Neon con pooling y TLS; definir APP_ORIGIN si se usa un dominio personalizado. Ejecutar las migraciones y el seed de forma controlada contra la base de demo y verificar los flujos en la URL HTTPS de prueba. Las pruebas locales no sustituyen esa comprobación remota.

No incluye administración de cuentas ni recuperación de contraseñas. El programa captura información de certificación y seguimiento; no expide certificaciones y tampoco realiza trámites externos.
