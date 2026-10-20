WITH normalized AS (
  SELECT id_declaracion,
    jsonb_set(
      datos_declarados,
      '{answers,section-2-30}',
      to_jsonb(CASE datos_declarados #>> '{answers,section-2-30}'
        WHEN 'Derretimiento de glaciares' THEN 'Derretimiento acelerado de glaciares'
        WHEN 'Acidificación o calentamiento de océanos' THEN 'Acidificación y calentamiento de los océanos'
        WHEN 'Sequía / desabastecimiento' THEN 'Sequía / desabastecimiento de agua'
        WHEN 'Derrame o fuga' THEN 'Derrames'
        WHEN 'Epidemia o pandemia' THEN 'Epidemias'
        WHEN 'Desertificación / erosión severa' THEN 'Desertificación y erosión severa del suelo'
        WHEN 'Contaminación crítica' THEN 'Contaminación crítica y colapso pesquero'
      END)
    ) AS datos
  FROM declaracion
  WHERE datos_declarados #>> '{answers,section-2-30}' IN (
    'Derretimiento de glaciares','Acidificación o calentamiento de océanos',
    'Sequía / desabastecimiento','Derrame o fuga','Epidemia o pandemia',
    'Desertificación / erosión severa','Contaminación crítica'
  )
)
UPDATE declaracion d
SET datos_declarados = normalized.datos,
    version = version + 1,
    actualizado_en = clock_timestamp()
FROM normalized
WHERE d.id_declaracion = normalized.id_declaracion;

UPDATE tipo_evento
SET nombre = CASE nombre
  WHEN 'Derretimiento de glaciares' THEN 'Derretimiento acelerado de glaciares'
  WHEN 'Acidificación o calentamiento de océanos' THEN 'Acidificación y calentamiento de los océanos'
  WHEN 'Sequía / desabastecimiento' THEN 'Sequía / desabastecimiento de agua'
  WHEN 'Derrame o fuga' THEN 'Derrames'
  WHEN 'Epidemia o pandemia' THEN 'Epidemias'
  WHEN 'Desertificación / erosión severa' THEN 'Desertificación y erosión severa del suelo'
  WHEN 'Contaminación crítica' THEN 'Contaminación crítica y colapso pesquero'
END
WHERE nombre IN (
  'Derretimiento de glaciares','Acidificación o calentamiento de océanos',
  'Sequía / desabastecimiento','Derrame o fuga','Epidemia o pandemia',
  'Desertificación / erosión severa','Contaminación crítica'
);

UPDATE evento e
SET nombre = t.nombre || ' · ' || coalesce(
  (SELECT m.nombre FROM municipio m WHERE m.id_municipio = e.id_municipio),
  'Ubicación pendiente'
)
FROM tipo_evento t
WHERE t.id_tipo_evento = e.id_tipo_evento;
