-- Archivo real de la pregunta 85, ausente del DBML propuesto inicial.
CREATE TABLE archivo_registro (
 id_archivo uuid PRIMARY KEY,
 id_registro uuid NOT NULL UNIQUE REFERENCES registro(id_registro) ON DELETE CASCADE,
 nombre text NOT NULL,
 mime text NOT NULL CHECK (mime IN ('application/pdf','image/png','image/jpeg')),
 contenido bytea NOT NULL CHECK (octet_length(contenido) BETWEEN 1 AND 5242880),
 creado_en timestamptz NOT NULL DEFAULT now()
);
