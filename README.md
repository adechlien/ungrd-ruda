# RUDA v8

La referencia oficial de este proyecto es [RUDAM_F002_v8.xlsx](docs/RUDAM_F002_v8.xlsx), conservada sin modificaciones. La revisión del archivo es 8; su portada indica formato F-RUDA-001, versión 5. La aplicación usa Angular, una API Express y PostgreSQL 17.

## Modelo y documentación

- [Modelo físico oficial DBML](docs/modelo-ruda-v8.dbml).
- [Modelo entidad–relación](docs/modelo-er.md).
- [Casos de uso](docs/use-cases.md).
- [Manual de sistema](docs/system-manual.md).
- [Manual de usuario](docs/user-guide.md).
- [Resultados de pruebas previas a Vercel](docs/pruebas-previas-vercel.md).

Los DBML anteriores son antecedentes. El modelo activo usa registro, registro_declarante, tipo_evento, evento_principal y evento_especifico. Las tablas normalizadas contienen la información operativa y auditoria_registro conserva una captura por versión, incluidos borradores incompletos.

## Iniciar el proyecto

Requisitos: Node.js 24, npm y Docker Desktop.

1. Ejecutar npm install.
2. Configurar .env a partir de .env.example con las credenciales locales; conservar el archivo existente si ya está configurado.
3. Ejecutar npm run db:up.
4. Ejecutar npm run db:migrate.
5. En una base nueva, ejecutar npm run db:seed.
6. Ejecutar npm run api en una terminal.
7. Ejecutar npm start en otra terminal.

Frontend: http://127.0.0.1:4305. API: http://127.0.0.1:4310/api. PostgreSQL local: 127.0.0.1:54321. El proxy de Angular conserva el mismo origen para las cookies. La API admite los orígenes configurados en server/app.mjs y APP_ORIGIN.

## Datos y transición a v8

Las migraciones 010 y 011 activan v8 y el almacenamiento de actas. La 010 conserva íntegros los datos anteriores en el esquema ruda_legacy_v7, transforma las respuestas históricas y conserva los UUID de registros, funcionarios, cuentas y eventos. Los registros terminados que no cumplen los campos obligatorios de v8 vuelven a borrador; no se inventan apellidos ni fechas. La transición añade una versión de auditoría por registro.

En la base local se conservaron 28 registros y su historial. De ellos, 17 antes terminados requieren completar información v8 y pasaron a borrador.

El seed crea cuentas y ejemplos ficticios cuando el funcionario todavía no tiene registros. No reemplaza capturas existentes. Las cuentas de demostración son peter@example.com y gwen@example.com, con contraseña RudaDemo2026!. Los registros y sesiones persisten en PostgreSQL. No eliminar el volumen de Docker si se desean conservar.

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

No incluye administración de cuentas ni recuperación de contraseñas. El programa captura información de certificación y seguimiento; no expide certificaciones ni realiza trámites externos.
