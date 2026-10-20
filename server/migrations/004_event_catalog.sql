ALTER TABLE categoria_evento ADD CONSTRAINT categoria_nombre_unique UNIQUE (nombre);
ALTER TABLE tipo_evento ADD CONSTRAINT tipo_categoria_nombre_unique UNIQUE (id_categoria, nombre);
