# Manual de usuario — RUDA v8

Fecha de actualización: 20 de octubre de 2026. Dirigido a los funcionarios que utilizarán la demostración.

## 1. Qué permite hacer la aplicación

La aplicación permite registrar declaraciones, conservar borradores, completar la información de un hogar, adjuntar un acta o comunicado cuando corresponda y consultar eventos y estadísticas. Cada funcionario trabaja con sus propios registros.

El formulario sigue el documento [RUDAM_F002_v8.xlsx](RUDAM_F002_v8.xlsx), revisión 8. La versión 5 indicada en la portada del formato corresponde a otra identificación del documento; no significa que el programa utilice RUDA v7.

Esta demostración se utiliza con datos ficticios. Terminar un registro confirma su validación dentro de la aplicación; no equivale a una radicación externa ni a la expedición de una certificación.

## 2. Ingresar y salir

1. Abrir la dirección de la aplicación proporcionada por el responsable de la prueba. En la instalación local es `http://127.0.0.1:4305`.
2. Escribir el correo y la contraseña de la cuenta asignada.
3. Iniciar sesión y esperar a que se carguen los registros.

Para la prueba están disponibles estas cuentas ficticias:

| Cuenta | Contraseña de demostración |
| --- | --- |
| `peter@example.com` | `RudaDemo2026!` |
| `gwen@example.com` | `RudaDemo2026!` |

Las cuentas muestran información distinta. Un funcionario no puede abrir las declaraciones ni los archivos del otro desde la aplicación.

Para salir, abrir el menú del perfil y seleccionar la opción de cierre de sesión. Antes de salir, guardar los cambios y comprobar el mensaje de guardado. La sesión tiene una duración limitada; si vence, volver a ingresar. Si no se puede acceder, contactar al responsable de la prueba: no hay recuperación automática de contraseñas.

## 3. Conocer la pantalla principal

La navegación permite consultar formularios, eventos y estadísticas. El menú del perfil muestra los datos de la cuenta y las preferencias de apariencia.

En pantallas de menos de 700 px de ancho, la navegación aparece como una barra horizontal fija en la parte inferior, con accesos a Registros, Eventos, Estadísticas, Perfil y Avisos. Los paneles de perfil y notificaciones se abren encima de la barra. En pantallas más amplias se utiliza la barra lateral.

Solo está disponible **Light / modo claro**. Las opciones Dark y System permanecen visibles, pero deshabilitadas.

### Formularios

El listado reúne los registros del funcionario y distingue los borradores de los terminados. Permite buscar, filtrar por estado y tipo de evento, ordenar por fecha, sitio o evento y cambiar de página.

Para localizar una declaración:

1. Escribir parte del nombre, documento o identificador en el buscador.
2. Revisar los filtros si el resultado esperado no aparece.
3. Abrir el registro para consultar o continuar su captura.

Los contadores se refieren a los registros de la cuenta actual. Al abrir una declaración, la aplicación puede situarse en la primera sección que falta completar.

### Eventos

La vista de eventos agrupa información procedente de declaraciones terminadas del funcionario. Buscar el evento y abrir su detalle para consultar los hogares, personas y registros asociados disponibles para esa cuenta. Un borrador todavía no contribuye a esta consulta de eventos terminados.

### Estadísticas

Las estadísticas resumen las capturas disponibles para la cuenta. Cambiar de categoría para consultar los indicadores y gráficos. La información depende de lo registrado y del estado de las declaraciones; los campos sin respuesta de un borrador pueden producir categorías sin información.

## 4. Crear una declaración y conservar un borrador

1. Utilizar la opción de crear un formulario en la pantalla principal.
2. Revisar el identificador generado por la aplicación. No es necesario inventar un número para ese campo.
3. Seleccionar el tipo de documento y escribir un número válido.
4. Completar los datos disponibles y pulsar **Guardar** para conservar el borrador.

El documento debe cumplir estas reglas para poder guardar:

| Tipo | Formato admitido |
| --- | --- |
| CC | Entre 6 y 10 dígitos. |
| TI o RC | Entre 10 y 11 dígitos. |
| NUIP | 10 dígitos. |
| CE o Pasaporte | Entre 6 y 12 caracteres alfanuméricos. |

Además del botón Guardar, la aplicación realiza guardados automáticos después de editar, siempre que el documento sea válido. No cerrar inmediatamente la pestaña tras un cambio: esperar la confirmación o utilizar Guardar.

El indicador **Cambios guardados** confirma un guardado reciente. Después muestra cuánto tiempo ha pasado desde el último guardado. **Aún no se ha guardado** indica que todavía no hay una confirmación de guardado para esa captura. Si aparece un error, atender el mensaje antes de salir.

Guardar permite continuar más tarde aunque falten respuestas. Terminar exige que la declaración cumpla las reglas aplicables.

## 5. Completar las seis secciones

Se puede cambiar de sección mediante la navegación del formulario. Los campos obligatorios y los mensajes de validación indican qué información hace falta. Algunas respuestas habilitan preguntas adicionales.

### 5.1. Declaración

Registrar identificación, nombres, fecha de nacimiento, residencia y datos del lugar donde se recibe la declaración. Revisar la información del funcionario receptor y la fecha.

- El primer nombre y los dos apellidos son obligatorios para terminar.
- Demás nombres es opcional.
- La fecha de nacimiento debe existir en el calendario, no ser futura y estar dentro del rango admitido.
- Seleccionar primero el departamento y luego un municipio correspondiente. Si cambia el departamento, revisar el municipio.

### 5.2. Evento

Registrar los datos del evento y su ubicación, la información de certificación y las condiciones del desplazamiento.

El tipo de evento determina las opciones del evento principal. **Mixto** permite elegir entre todos los eventos principales disponibles; **Por determinar** ofrece **Otro**. Revisar las selecciones dependientes cuando se cambie el tipo.

Las preguntas 35 a 38 recogen la información de certificación, incluidas fechas y entidad. Si se elige otra entidad, completar su detalle cuando se habilite. Estas respuestas documentan información; no generan un certificado.

Las preguntas 39 a 52 registran salida, origen, alojamiento, ubicación actual y otros datos del desplazamiento. Entre las opciones de alojamiento está Hotel. Completar los detalles que correspondan y verificar los municipios.

### 5.3. Narración

Escribir la narración de los hechos. Es obligatoria, pero **no tiene un mínimo de 300 caracteres**.

Las preguntas guía ayudan a organizar el relato según el evento seleccionado. Sus respuestas son opcionales y admiten texto libre. No es necesario responderlas todas para terminar.

### 5.4. Caracterización

Revisar los integrantes del hogar, los animales domésticos, la unidad productiva y las necesidades básicas, además de la información complementaria solicitada.

La aplicación incorpora al declarante entre los integrantes. Si aparece como **Pendiente**, abrir su edición mediante **Completar datos**, revisar los campos y guardar los datos del integrante. Tener los datos principales del declarante en la primera sección no sustituye esta revisión.

Para agregar otro integrante, utilizar el control correspondiente, completar el formulario de la ventana y guardar. Revisar documento, nombres y fecha de nacimiento de cada persona. Cancelar la ventana no confirma los cambios de esa edición.

Agregar filas cuando se necesite registrar varios animales. Si se declara una unidad productiva, completar los detalles habilitados, como tipo, tenencia, ingresos, funcionamiento y empleados. Las preguntas adicionales dependen de las respuestas elegidas.

El número RUD es opcional; si se informa, debe ser único. Para la demostración, no reutilizar el mismo número en hogares diferentes.

### 5.5. Bienes

Registrar los inmuebles y los bienes muebles o semovientes que correspondan. Utilizar las filas adicionales para varios bienes y revisar cada entrada.

Completar la información económica y de salud solicitada. Respetar las unidades mostradas en cada campo: un valor en pesos no se interpreta como un número de salarios mínimos. Escribir cantidades válidas y completar las descripciones que se habiliten según las respuestas.

### 5.6. Étnico-colectivo

Revisar si el módulo aplica al caso y seleccionar la respuesta correspondiente. Cuando no aplica, sus preguntas permanecen deshabilitadas y no impiden terminar.

Cuando aplica, registrar comunidad, territorio, representación, afectaciones y seguimiento, de acuerdo con los campos habilitados. Las preguntas de este módulo llegan hasta la número 90. Completar también los detalles condicionales de respuestas afirmativas.

Si en la pregunta 85 se indica que existe un acta o comunicado, utilizar el control de archivo descrito a continuación.

## 6. Subir, descargar o retirar el acta

El control de archivo está en la sección Étnico-colectivo cuando aplica el módulo y corresponde adjuntar el acta o comunicado.

1. Preparar un archivo PDF, PNG o JPG/JPEG.
2. Comprobar que no supera **4 MB** en el límite de la aplicación: 4.194.304 bytes.
3. Seleccionar el archivo desde el control de carga.
4. Esperar el mensaje de confirmación y comprobar que se muestra el archivo adjunto.

La aplicación puede guardar primero el borrador para asociar el archivo; por eso debe existir un documento válido. Un archivo renombrado con una extensión permitida puede rechazarse si su contenido no coincide con el formato.

Utilizar el enlace del archivo para descargarlo. Para cambiarlo, cargar el nuevo archivo; reemplazará al vigente. La opción de retirar elimina el adjunto vigente. Guardar el formulario de manera ordinaria conserva el archivo que ya estaba adjunto.

Si la carga falla, revisar el tamaño, formato y conexión. Conservar el archivo original hasta comprobar que la carga terminó correctamente.

## 7. Guardar, terminar y volver al listado

### Guardar un borrador

Pulsar **Guardar** y esperar la confirmación. El registro puede conservarse incompleto para retomarlo desde el listado. Si la declaración estaba terminada y una edición deja de cumplir los requisitos, puede volver a borrador.

### Terminar una declaración

1. Revisar las seis secciones y las preguntas que apliquen.
2. Completar los integrantes pendientes y corregir los valores señalados.
3. Pulsar **Terminar** cuando esté habilitado.
4. Esperar la confirmación y comprobar el estado en el listado.

El botón depende de las validaciones, no únicamente del porcentaje de avance. Como hay preguntas opcionales, un registro válido puede terminar sin mostrar el 100 %.

Si Terminar permanece deshabilitado, revisar campos obligatorios, documentos, fechas de nacimiento, municipios, revisión de integrantes y preguntas condicionales. Si el servidor detecta otro problema, corregirlo según el mensaje mostrado.

### Volver sin perder trabajo

Al utilizar Volver puede aparecer el diálogo **¿Guardar el borrador y volver?**:

| Opción | Resultado |
| --- | --- |
| Cancelar | Permanecer en el formulario. |
| Volver sin guardar | Salir sin solicitar un guardado adicional. Los cambios ya guardados automáticamente permanecen. |
| Guardar y volver | Guardar el borrador y regresar al listado si el guardado tiene éxito. |

Para comprobar la persistencia, volver al listado y abrir el registro. Recargar la página solo después de confirmar el guardado.

## 8. Controles para la demostración

Los controles **Llenar parcialmente** y **Llenar por completo** facilitan las pruebas con información ficticia. Usan como referencia un registro terminado disponible para la cuenta. Si no existe una referencia, se muestra un mensaje y no se completa la captura.

Estos controles no sustituyen la revisión de datos ni la validación de cierre. Después de utilizarlos, revisar las secciones, integrantes y condiciones del caso antes de pulsar Terminar. El número RUD no se copia para evitar duplicarlo entre hogares.

## 9. Resolver problemas habituales

| Situación | Qué hacer |
| --- | --- |
| No puedo ingresar | Comprobar correo y contraseña. Si hubo muchos intentos, esperar un minuto. Contactar al responsable si continúa. |
| La sesión venció | Volver a iniciar sesión y abrir el registro. Verificar lo que quedó guardado. |
| No permite guardar el primer borrador | Revisar el tipo y número de documento. |
| No encuentro un registro | Revisar la cuenta activa, búsqueda, filtros y páginas del listado. |
| No aparece un evento | Comprobar que tiene declaraciones propias terminadas asociadas. |
| Hay un conflicto por cambios de otra sesión | Conservar aparte las modificaciones necesarias, recargar el registro y trabajar sobre la versión actual. Evitar editarlo simultáneamente en varias pestañas. |
| Se solicita actualizar el formulario | Recargar para utilizar la revisión v8; verificar primero qué cambios quedaron guardados. |
| El acta se rechaza | Revisar el formato real y el límite de 4 MB; intentar con un archivo válido de menor tamaño. |
| Se perdió la conexión o falló el guardado | Mantener abierto el formulario, conservar aparte el texto importante y reintentar cuando vuelva la conexión. No asumir que un mensaje de error confirmó el guardado. |
| Un registro antiguo volvió a borrador | Completar los campos requeridos por v8 y terminarlo nuevamente. La información anterior se conserva para revisión. |

Si el problema persiste, comunicar al responsable la operación realizada, la hora y el mensaje visible. No compartir contraseñas ni cookies. Para instalación, configuración y diagnóstico técnico, consultar el [manual de sistema](system-manual.md).
