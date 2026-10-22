# Manual de usuario — RUDA v8

## 1. Qué permite hacer la aplicación

RUDA es la aplicación web de la UNGRD para el Registro Único de Desplazamiento Ambiental. Con ella el funcionario receptor registra la declaración de una familia afectada por una emergencia, guarda el avance y lo termina cuando la información está completa.

Con la aplicación se puede:

- Crear registros y continuar los que quedaron por terminar.
- Asociar cada registro a un evento: inundación, deslizamiento, incendio forestal, entre otros.
- Caracterizar el hogar: integrantes, bienes, ingresos, salud y módulo étnico-colectivo.
- Adjuntar el acta o comunicado cuando corresponda.
- Consultar eventos y estadísticas de los registros propios.

Cada funcionario ve únicamente sus propios registros. El formulario sigue el formato oficial RUDAM\_F002, revisión 8.

Terminar un registro confirma que pasó las validaciones de la aplicación. No equivale a aprobar la inclusión en el RUDA ni a expedir una certificación.

## 2. Ingresar y salir

### Ingresar

1. Abrir en el navegador la dirección **https://ungrd-ruda.vercel.app**.
2. Escribir el correo en el campo **Correo Institucional**.
3. Escribir la contraseña en el campo **Contraseña**.
4. Pulsar **Ingresar** y esperar a que cargue la pantalla **Mis registros**.

![Pantalla de inicio de sesión](../images/01-login.png)

Para la demostración están disponibles dos cuentas con datos ficticios:

| Correo | Contraseña |
| --- | --- |
| peter@example.com | RudaDemo2026! |
| gwen@example.com | RudaDemo2026! |

Cada cuenta ve registros distintos: un funcionario no puede abrir los registros del otro.

Si se escribe mal la contraseña más de 10 veces seguidas, hay que esperar un minuto antes de intentarlo de nuevo. La aplicación no tiene opción para recuperar la contraseña; en ese caso se debe contactar al responsable del sistema.

### Salir

1. Comprobar que el registro abierto muestre **Cambios guardados**.
2. Pulsar el nombre del usuario, en la esquina inferior izquierda.
3. Pulsar **Cerrar sesión**.

![Menú del usuario abierto](../images/02-menu-usuario.png)

El menú muestra el nombre y el correo de la cuenta, un selector de **Preferencias** de apariencia (claro, oscuro o el del dispositivo) y la opción **Cerrar sesión**, en rojo.

La sesión dura 8 horas. Si vence, la aplicación pide ingresar de nuevo; lo que ya se había guardado se conserva.

## 3. Pantalla principal

Al ingresar se abre **Mis registros**. A la izquierda está el menú con tres opciones: **Registros**, **Eventos** y **Estadísticas**. Abajo a la izquierda aparecen el nombre del usuario y la campana de **Avisos**.

![Pantalla Mis registros](../images/03-mis-registros.png)

En pantallas pequeñas, como un celular, el menú se muestra como una barra fija en la parte inferior.

### Mis registros

Arriba aparecen tres contadores:

| Contador | Qué indica |
| --- | --- |
| Total de registros | Todos los registros de la cuenta. |
| Terminados | Registros completos, que se pueden consultar y editar. |
| Por terminar | Registros con información pendiente. |

Debajo, cada registro aparece como una tarjeta con su estado, su código, el nombre y documento del declarante, el evento con su municipio, el porcentaje de **Campos diligenciados** y la fecha de **Última actualización**. Para abrir un registro, se hace clic en su tarjeta.

### Buscar y filtrar

1. Escribir en el buscador parte del nombre, el documento o el código del registro.
2. Usar las pestañas **Todos**, **Por terminar** o **Terminados** para filtrar por estado.
3. Pulsar el ícono del embudo, a la derecha del buscador, para filtrar por tipo de evento u ordenar los resultados.

![Panel de filtros abierto](../images/04-filtros.png)

Si un registro no aparece, conviene revisar la pestaña activa, el filtro de tipo de evento y el texto del buscador.

### Eventos

Muestra los eventos (los hechos que originaron los desplazamientos) y los hogares vinculados a cada uno. Arriba aparecen tres contadores: **Eventos registrados**, **Hogares vinculados** y **Personas afectadas**. El buscador permite encontrar un evento por nombre, lugar, fecha o declarante.

Solo se cuentan los registros **terminados**. Si la cuenta no tiene ninguno, la vista aparece vacía con el mensaje **No se encontraron eventos**.

![Vista Eventos sin registros terminados](../images/05-eventos-vacio.png)

Cuando hay registros terminados, cada evento aparece como una tarjeta con su código (por ejemplo, **EVT-00013**), su categoría, su nombre, el lugar y la fecha, y tres cifras: **registros**, **hogares** y **personas**.

![Vista Eventos con un evento](../images/06-eventos-con-evento.png)

Al hacer clic en la tarjeta se abre el detalle del evento. Muestra el lugar específico, el evento registrado y, en **Registros a su cargo**, la lista de declaraciones asociadas, cada una con su estado. La flecha de cada registro lo abre. La **X** cierra la ventana.

![Detalle de un evento](../images/07-detalle-evento.png)

### Estadísticas

Muestra indicadores y gráficos de los registros de la cuenta. Arriba aparecen tres contadores: **Eventos**, **Desplazamientos** (con fecha de salida informada) y **Declarantes** (personas únicas por documento).

Los gráficos se organizan en tres pestañas:

| Pestaña | Qué muestra |
| --- | --- |
| Panorama | Desplazamientos por tipo de evento, declarantes por sexo y municipios de origen. |
| Desplazamiento | Momento de la salida respecto al evento (antes, durante, después o salidas sucesivas), carácter de la salida (forzada, voluntaria, mixta o por verificar) y evolución del evento (repentino o lento). |
| Situación actual | Tipo de alojamiento después del desplazamiento (albergue, arriendo, vivienda de un familiar, entre otros) y razón principal para no retornar. |

![Estadísticas, pestaña Panorama](../images/08-estadisticas-panorama.png)

### Avisos

La campana de la esquina inferior izquierda abre el panel de **Notificaciones**. Un punto sobre la campana indica que hay avisos. Hoy el panel informa cuántos registros están **por terminar** y recuerda que se pueden continuar desde **Registros**. El enlace **Ver mis registros** lleva al listado, y la **X** cierra el panel.

![Panel de Notificaciones](../images/09-notificaciones.png)

## 4. Crear un registro y guardar

1. En **Mis registros**, pulsar **+ Nuevo registro**.
2. Revisar el código que aparece en gris en el primer campo. Lo genera el sistema; no hay que escribir nada ahí.
3. Elegir el **Tipo de documento** y escribir el **Número de documento** del declarante.
4. Completar los datos disponibles y pulsar **Guardar**.

![Nuevo registro, sección Declaración](../images/10-nuevo-registro.png)

### Partes de la pantalla del registro

| Zona | Qué contiene |
| --- | --- |
| Barra superior | **Volver**, el indicador de guardado, **Guardar** y **Terminar registro**. |
| Barra de pasos | Las seis secciones del formulario. Se puede hacer clic en cualquiera para ir a ella. |
| Panel derecho | Resumen del declarante y del evento, el botón **Ver portada** y el avance del registro. |

El panel derecho muestra dos contadores de avance: las respuestas de todo el registro (por ejemplo, 4 de 94) y las de la sección abierta (por ejemplo, 4 de 23).

Cuando todas las respuestas de la sección tienen un formato correcto, el panel derecho muestra el aviso **Información válida**. Al final de cada sección, el botón **Continuar** lleva a la siguiente.

Si faltan datos o hay errores, el panel muestra en amarillo **Revisión necesaria**, con el número de respuestas por completar o corregir. A veces también indica qué campos revisar, por ejemplo **Miembros del hogar**.

### Ver portada

El botón **Ver portada** abre una ventana de consulta sobre el registro RUDA. Tiene cuatro pestañas: **Información general**, **Definiciones**, **Reparación integral** y **Marco normativo**. Allí se encuentran el código del formato (F-RUDA-001, versión 5), la entidad responsable y las normas aplicables. Para cerrarla se pulsa la X de la esquina superior derecha.

![Ventana Portada, pestaña Información general](../images/11-portada.png)

### Requisito para guardar

Para guardar por primera vez, el documento del declarante debe tener un formato válido:

| Tipo | Formato admitido |
| --- | --- |
| CC | Entre 6 y 10 dígitos. |
| TI o RC | Entre 10 y 11 dígitos. |
| NUIP | 10 dígitos. |
| CE o Pasaporte | Entre 6 y 12 letras o números. |

### Guardado automático

Cuando el documento es válido, la aplicación guarda sola poco después de cada cambio. El indicador de la barra superior muestra el estado:

| Indicador | Significado |
| --- | --- |
| Aún no se ha guardado | Los cambios todavía no están guardados. |
| Cambios guardados | El último cambio acaba de guardarse. |
| Último guardado hace X min | Indica cuánto tiempo pasó desde el último guardado. |

No se debe cerrar la pestaña justo después de un cambio: hay que esperar a que aparezca **Cambios guardados** o pulsar **Guardar**. Un registro guardado puede quedar incompleto y retomarse después desde **Mis registros**.

## 5. Completar las seis secciones

El formulario tiene seis secciones. Los campos con asterisco (\*) son obligatorios para terminar el registro. Algunas respuestas habilitan preguntas adicionales.

### 5.1. Declaración

Registrar la identificación, los nombres, la fecha de nacimiento, la residencia y los datos del lugar donde se recibe la declaración.

- El primer nombre y los dos apellidos son obligatorios; **Demás nombres** es opcional.
- La fecha de nacimiento debe ser real y no puede ser futura.
- Elegir primero el departamento y después el municipio. Si se cambia el departamento, hay que volver a elegir el municipio.

### 5.2. Evento

Registrar el evento que causó la afectación, la certificación y los datos del desplazamiento.

**Asociar un evento ya registrado.** El primer campo de la sección, **Evento asociado a esta declaración**, viene con la opción **Registrar un evento nuevo**. Si la familia fue afectada por un evento que ya está en la aplicación (por ejemplo, la misma inundación declarada por otra familia), se elige de esa lista en vez de crearlo de nuevo. Así los registros del mismo evento quedan agrupados. La lista solo muestra eventos de registros terminados.

**Registrar un evento nuevo.** Si el evento no está en la lista, se deja **Registrar un evento nuevo** y se completan los datos del evento: fecha de inicio, departamento, municipio, tipo de evento, evento principal y evolución, entre otros.

- El **Municipio** se habilita después de elegir el **Departamento**.
- El **Evento principal** se habilita después de elegir el **Tipo de evento**, y sus opciones dependen de él. **Mixto** permite elegir entre todos y **Por determinar** ofrece **Otro**.

![Sección Evento](../images/12-seccion-evento.png)

Las preguntas 35 a 38 recogen la certificación (fechas y entidad) y las preguntas 39 a 52 el desplazamiento (salida, origen, alojamiento y ubicación actual). Estas respuestas solo documentan la información; no generan un certificado.

### 5.3. Narración

Escribir el relato de los hechos. Es obligatorio, pero no tiene un mínimo de caracteres.

Debajo del espacio de narración aparece un contador de caracteres.

Más abajo están las **Preguntas guía por tipo de evento**. Cambian según el tipo de evento elegido en la sección Evento; un recuadro indica a qué tipo corresponden. Ayudan a organizar el relato y son opcionales.

![Sección Narración de los hechos](../images/13-seccion-narracion.png)

### 5.4. Caracterización

Registrar los integrantes del hogar, los animales domésticos, la unidad productiva y las necesidades básicas.

La aplicación agrega al declarante como primer integrante del hogar. Su tarjeta muestra el aviso **Completar datos** hasta que se revisan sus datos: hacer clic en la tarjeta, completar los campos y guardar. Haber llenado la sección Declaración no reemplaza este paso.

Para agregar otro integrante, pulsar **+ Añadir miembro**, completar la ventana y guardar. Cancelar la ventana descarta los cambios de esa edición. A la derecha se muestra el número de miembros registrados.

![Sección Caracterización del hogar](../images/14-seccion-caracterizacion.png)

![Ventana Añadir miembro del hogar](../images/15-anadir-miembro.png)

La ventana **Añadir miembro del hogar** pide, entre otros datos: apellidos y nombres, tipo y número de documento, fecha de nacimiento, género, estado civil, ocupación, escolaridad, EPS, nivel Sisbén, etnia, discapacidad y relación con el declarante. El único campo obligatorio es **Apellidos y nombres** (marcado con asterisco); el botón **Añadir** se habilita cuando está escrito. **Cancelar** cierra la ventana sin guardar.

El número RUD es opcional; si se escribe, no puede repetirse en otro hogar.

### 5.5. Bienes

Registrar los inmuebles y los bienes muebles o semovientes, además de la información económica y de salud. Se pueden agregar filas para registrar varios bienes.

Para registrar más de un bien, pulsar **Añadir otro registro** debajo del grupo correspondiente.

Hay que respetar la unidad de cada campo: los valores en pesos se escriben como número, sin puntos ni signo ($COP), y un valor en pesos no es lo mismo que un número de salarios mínimos.

![Sección Bienes y patrimonio](../images/16-seccion-bienes.png)

### 5.6. Étnico-colectivo

Arriba aparece la pregunta **¿El declarante pertenece a una comunidad étnica o el desplazamiento es colectivo?** con un interruptor en **No**. Se considera desplazamiento colectivo cuando salen 3 o más hogares de una misma comunidad.

- Con el interruptor en **No**, las preguntas se ven pero quedan deshabilitadas y no cuentan para el avance ni impiden terminar.
- Al activarlo, se habilitan las preguntas de comunidad, territorio, representante, afectaciones y seguimiento.

![Sección Módulo étnico-colectivo con el interruptor en No](../images/17-seccion-etnico.png)

Si en la pregunta 85 se indica que existe un acta o comunicado, se adjunta como se explica en la sección 6.

## 6. Subir, descargar o retirar el acta

El control para adjuntar el acta aparece en la sección **Étnico-colectivo** cuando el módulo aplica y la pregunta 85 se responde **Sí**.

1. Preparar el archivo en formato PDF, PNG o JPG, de máximo 4 MB.
2. Seleccionar el archivo desde el control de carga.
3. Esperar el mensaje de confirmación y comprobar que el archivo aparece adjunto.

Cuando el archivo se adjunta, su nombre aparece en el campo del acta junto con las opciones para descargarlo o retirarlo.

Para descargar el acta, pulsar su enlace. Para cambiarla, subir un archivo nuevo: reemplaza al anterior. La opción de retirar elimina el archivo adjunto.

Si la carga falla, revisar el tamaño, el formato y la conexión. Un archivo al que solo se le cambió la extensión (por ejemplo, un Word renombrado a .pdf) será rechazado.

## 7. Terminar el registro y volver al listado

### Terminar un registro

El botón **Terminar registro** aparece en gris mientras falten datos obligatorios. Cuando el registro está completo, se habilita.

1. Revisar las seis secciones.
2. Revisar los integrantes que muestren el aviso **Completar datos**.
3. Corregir los campos que la aplicación marque.
4. Pulsar **Terminar registro** y esperar la confirmación.
5. Volver a **Mis registros** y comprobar que el registro aparece como **Terminado**.

Mientras falte información, el botón permanece en gris y no se puede pulsar. El panel derecho muestra el aviso amarillo **Revisión necesaria** con el número de respuestas por completar o corregir. Cuando se corrigen, aparece **Información válida** y el botón se habilita. Al pulsarlo, la aplicación confirma que el registro quedó terminado y este pasa a la pestaña **Terminados** de **Mis registros**.

![Registro completo con el botón Terminar registro habilitado](../images/18-terminar-habilitado.png)

El porcentaje de avance cuenta también las preguntas opcionales. Por eso un registro puede terminarse sin llegar al 100 %.

Si se edita un registro terminado y deja de cumplir los requisitos, vuelve a quedar **Por terminar**.

### Volver sin perder trabajo

Al pulsar **Volver** puede aparecer la ventana **¿Guardar el borrador y volver?**:

| Opción | Resultado |
| --- | --- |
| Cancelar | Se queda en el formulario. |
| Volver sin guardar | Regresa al listado. Lo que ya se guardó automáticamente se conserva. |
| Guardar y volver | Guarda y regresa al listado. |

## 8. Controles para la demostración

Los botones **Llenar parcialmente** y **Llenar por completo** completan el formulario con datos ficticios para hacer pruebas rápidas. Toman como modelo un registro terminado de la cuenta; si la cuenta no tiene ninguno terminado, muestran un aviso y no llenan nada.

Los botones están en el panel derecho del registro, debajo del aviso de validación.

![Botones Llenar parcialmente y Llenar por completo](../images/19-botones-llenar.png)

Después de usarlos hay que revisar las secciones antes de pulsar **Terminar registro**. El número RUD no se copia, para no repetirlo entre hogares.

Estos controles son solo para la demostración y no deben estar disponibles cuando la aplicación se use con datos reales.

## 9. Resolver problemas habituales

| Situación | Qué hacer |
| --- | --- |
| No puedo ingresar | Revisar correo y contraseña. Si hubo muchos intentos, esperar un minuto. Si sigue fallando, contactar al responsable del sistema. |
| La sesión venció | Ingresar de nuevo y abrir el registro. Revisar qué quedó guardado. |
| No deja guardar el primer borrador | Revisar el tipo y el número de documento del declarante. |
| No encuentro un registro | Revisar la pestaña activa, los filtros y el buscador. |
| No aparece un evento en Eventos | Solo se muestran eventos con registros terminados de la cuenta. |
| Terminar registro sigue en gris | Revisar campos obligatorios, fechas, municipios e integrantes con el aviso Completar datos. |
| Aparece un aviso de cambios en otra sesión | El registro se editó en otra pestaña. Copiar aparte lo importante, recargar y continuar sobre la versión actual. |
| Se pide recargar el formulario | Recargar la página después de revisar qué quedó guardado. |
| El acta es rechazada | Revisar que sea PDF, PNG o JPG real y que no supere 4 MB. |
| Se perdió la conexión | No cerrar el formulario, copiar aparte el texto importante y pulsar Guardar cuando vuelva la conexión. |
| Un registro antiguo volvió a Por terminar | Completar los campos que exige la versión 8 y terminarlo de nuevo. |

Si el problema continúa, informar al responsable del sistema qué se estaba haciendo, la hora y el mensaje que apareció. Nunca compartir la contraseña.
