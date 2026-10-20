UPDATE categoria_evento SET nombre = 'Desastres' WHERE nombre = 'Desastre';

WITH normalized AS (
  SELECT id_declaracion,
    CASE datos_declarados #>> '{answers,section-2-30}'
      WHEN 'Movimiento en masa' THEN jsonb_set(
        CASE WHEN datos_declarados #>> '{answers,section-2-29}' = 'Desastre' THEN jsonb_set(datos_declarados,'{answers,section-2-29}','"Desastres"'::jsonb) ELSE datos_declarados END,
        '{answers,section-2-30}', '"Movimientos en masa"'::jsonb)
      WHEN 'Evacuación preventiva' THEN jsonb_set(
        CASE WHEN datos_declarados #>> '{answers,section-2-29}' = 'Desastre' THEN jsonb_set(datos_declarados,'{answers,section-2-29}','"Desastres"'::jsonb) ELSE datos_declarados END,
        '{answers,section-2-30}', '"Amenaza de ruina o inminencia de colapso de edificaciones"'::jsonb)
      ELSE jsonb_set(datos_declarados, '{answers,section-2-29}', '"Desastres"'::jsonb)
    END AS datos
  FROM declaracion
  WHERE datos_declarados #>> '{answers,section-2-29}' = 'Desastre'
     OR datos_declarados #>> '{answers,section-2-30}' IN ('Movimiento en masa','Evacuación preventiva')
)
UPDATE declaracion d
SET datos_declarados = normalized.datos,
    version = version + 1,
    actualizado_en = clock_timestamp()
FROM normalized
WHERE d.id_declaracion = normalized.id_declaracion;

UPDATE tipo_evento SET nombre = 'Movimientos en masa' WHERE nombre = 'Movimiento en masa';

UPDATE tipo_evento
SET nombre = 'Amenaza de ruina o inminencia de colapso de edificaciones'
WHERE nombre = 'Evacuación preventiva';
