# Modelo entidad–relación RUDA v8

Referencia oficial del proyecto: [RUDAM_F002_v8.xlsx](RUDAM_F002_v8.xlsx). Modelo físico: [modelo-ruda-v8.dbml](modelo-ruda-v8.dbml). Casos de uso: [use-cases.md](use-cases.md). Verificación: [pruebas-previas-vercel.md](pruebas-previas-vercel.md).

La revisión RUDA es 8; la versión del formato que aparece en la portada es 5. La versión de un registro es un contador de ediciones y se conserva por separado.

El esquema activo contiene 32 entidades de negocio. `schema_migration` es infraestructura técnica y no forma parte del modelo del formulario. La estructura anterior queda archivada en `ruda_legacy_v7`; no se usa para las nuevas operaciones.

## Lectura

`||`: exactamente uno. `o|`: cero o uno. `o{`: cero o muchos. Las cardinalidades describen lo que permite la base, incluidos borradores. Para terminar, el contrato del formulario exige sus campos obligatorios y un hogar con integrantes.

## Registro, identidad y acceso

```mermaid
erDiagram
    ORGANIZACION ||--o{ FUNCIONARIO : vincula
    FUNCIONARIO ||--o| USUARIO : cuenta
    USUARIO ||--o{ SESION : inicia
    FUNCIONARIO ||--o{ REGISTRO : registra
    ORGANIZACION ||--o{ REGISTRO : recibe
    PERSONA ||--o{ REGISTRO : declara
    REGISTRO ||--o| REGISTRO_DECLARANTE : fotografia_identidad
    REGISTRO ||--o| OBSERVACION_REGISTRO : narracion
    REGISTRO ||--o{ RESPUESTA_GUIA : respuestas
    PREGUNTA_GUIA ||--o{ RESPUESTA_GUIA : pregunta
    REGISTRO ||--o{ AUDITORIA_REGISTRO : versiones
    FUNCIONARIO ||--o{ AUDITORIA_REGISTRO : responsable
    REGISTRO ||--o| ARCHIVO_REGISTRO : acta_comunicado

    REGISTRO {
        uuid id_registro PK
        bigint id_persona_declarante FK
        bigint id_funcionario FK
        bigint id_organizacion_receptora FK
        bigint id_municipio_declaracion FK
        text estado
        smallint version_formato
        smallint revision_ruda
        integer version_registro
        timestamptz creado_en
        timestamptz actualizado_en
        timestamptz terminado_en
    }
    PERSONA {
        bigint id_persona PK
        text tipo_documento
        text numero_documento
    }
    REGISTRO_DECLARANTE {
        uuid id_registro PK, FK
        text primer_apellido
        text segundo_apellido
        text primer_nombre
        text demas_nombres
        date fecha_nacimiento
        text sexo
        bigint id_municipio_residencia FK
    }
    AUDITORIA_REGISTRO {
        bigint id_auditoria PK
        uuid id_registro FK
        bigint id_funcionario FK
        integer version_registro
        text estado
        jsonb snapshot
    }
```

`PERSONA` guarda la identidad canónica por tipo y número de documento. Los nombres, domicilio y contacto capturados pertenecen a `REGISTRO_DECLARANTE`, por lo que un cambio en otro registro de la misma persona no reescribe su declaración histórica.

La auditoría conserva una captura completa por versión. La última captura permite reabrir exactamente lo escrito, incluidos datos todavía incompletos del borrador y la revisión de la ficha del declarante. Las tablas operativas mantienen la proyección normalizada dentro de la misma transacción.

## Eventos, desplazamiento y territorio

```mermaid
erDiagram
    TIPO_EVENTO ||--o{ EVENTO_PRINCIPAL : clasifica
    EVENTO_PRINCIPAL o|--o{ EVENTO_ESPECIFICO : ocurrencia
    FUNCIONARIO ||--o{ EVENTO_ESPECIFICO : crea
    EVENTO_ESPECIFICO o|--o{ DESPLAZAMIENTO : origina
    REGISTRO ||--o| DESPLAZAMIENTO : documenta
    DESPLAZAMIENTO ||--o| CERTIFICACION_DESPLAZAMIENTO : certificacion
    DEPARTAMENTO ||--o{ MUNICIPIO : agrupa
    MUNICIPIO o|--o{ EVENTO_ESPECIFICO : ubicacion_evento
    MUNICIPIO o|--o{ DESPLAZAMIENTO : origen
    MUNICIPIO o|--o{ DESPLAZAMIENTO : ubicacion_actual
    MUNICIPIO o|--o{ REGISTRO : lugar_declaracion
    MUNICIPIO o|--o{ REGISTRO_DECLARANTE : residencia

    EVENTO_PRINCIPAL {
        bigint id_evento_principal PK
        bigint id_tipo_evento FK
        text nombre
        boolean activo
    }
    EVENTO_ESPECIFICO {
        bigint id_evento_especifico PK
        bigint id_evento_principal FK
        bigint id_municipio FK
        date fecha_inicio
        time hora_inicio
        text numero_decreto_calamidad
        bigint creado_por FK
    }
    CERTIFICACION_DESPLAZAMIENTO {
        bigint id_certificacion PK
        bigint id_desplazamiento FK, UK
        date fecha_solicitud
        date fecha_emision
        text entidad_apoyo
        text otra_entidad
    }
```

`TIPO_EVENTO` corresponde a la pregunta 29 y `EVENTO_PRINCIPAL` a la 30. `EVENTO_ESPECIFICO` identifica una ocurrencia compartida con fecha y ubicación. La certificación corresponde al desplazamiento, no a una decisión automática del programa.

## Hogar, patrimonio y afectaciones

```mermaid
erDiagram
    REGISTRO ||--o| HOGAR : caracteriza
    HOGAR ||--o{ MIEMBRO_HOGAR : integrantes_ordenados
    HOGAR ||--o{ ANIMAL_DOMESTICO : animales
    HOGAR ||--o| UNIDAD_PRODUCTIVA : actividad_productiva
    HOGAR ||--o| NECESIDAD_BASICA : necesidades
    HOGAR ||--o{ BIEN_INMUEBLE : inmuebles
    HOGAR ||--o{ BIEN_MUEBLE_SEMOVIENTE : muebles_semovientes
    HOGAR ||--o| INFORMACION_ECONOMICA : ingresos
    HOGAR ||--o| AFECTACION_SALUD : salud

    HOGAR {
        bigint id_hogar PK
        uuid id_registro FK, UK
        text numero_formulario_rud UK
    }
    MIEMBRO_HOGAR {
        bigint id_miembro_hogar PK
        bigint id_hogar FK
        smallint numero_orden
        text apellidos_nombres
        text tipo_documento
        text numero_documento
        text lugar_inscripcion_cedula
        text relacion_declarante
    }
```

Los integrantes se conservan como fueron declarados dentro de cada hogar; no comparten una ficha mutable con otros hogares. El orden es único dentro del hogar. La API evita documentos duplicados dentro de una misma captura.

La unidad productiva y las caracterizaciones de necesidades, economía y salud son únicas por hogar. Animales, inmuebles y muebles/semovientes permiten varios registros. El ingreso de la unidad productiva se expresa en SMMLV; el hogar registra ingreso en COP y equivalente en SMMLV en campos separados.

## Comunidad y seguimiento

```mermaid
erDiagram
    TERRITORIO_COLECTIVO o|--o{ COMUNIDAD : territorio
    COMUNIDAD ||--o{ MODULO_ETNICO : referencia
    HOGAR ||--o| MODULO_ETNICO : caracterizacion_etnica
    MODULO_ETNICO ||--o| SEGUIMIENTO_ETNICO : seguimiento
```

El módulo se diligencia cuando corresponde a una comunidad étnica o a desplazamiento colectivo. Las respuestas incompletas de un borrador se conservan sin inventar nombres de comunidad, representante o territorio para satisfacer claves obligatorias.

## Restricciones y conservación

- UUID único por registro; versión del registro mayor que cero y revisión RUDA fijada en 8.
- Un usuario por funcionario; correo único en minúsculas y sesiones por token hash.
- Una fotografía del declarante, observación, desplazamiento, hogar y acta por registro como máximo.
- Una certificación por desplazamiento; una respuesta por registro y código de pregunta.
- Un número de formulario RUD no vacío identifica como máximo un hogar; varios hogares pueden no tenerlo.
- Las dependencias del registro usan borrado en cascada. Personas, eventos y catálogos son entidades compartidas y no se borran al eliminar un registro.
- Acta: PDF/PNG/JPG, máximo 4 MB, almacenada en `ARCHIVO_REGISTRO`; descarga y modificación restringidas al funcionario propietario. La carga reemplaza el archivo actual del registro.
- El DBML contiene el diccionario completo; los diagramas muestran atributos seleccionados para facilitar la lectura.
