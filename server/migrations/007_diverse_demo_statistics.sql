-- Diversifica exclusivamente los registros ficticios para que los gráficos
-- representen varios escenarios. Los documentos delimitan el conjunto demo.
CREATE TEMP TABLE demo_estadistica (
  documento text PRIMARY KEY,
  sexo text NOT NULL,
  momento text NOT NULL,
  caracter text NOT NULL,
  fuera text NOT NULL,
  alojamiento text NOT NULL,
  retorno text NOT NULL,
  municipio text NOT NULL
) ON COMMIT DROP;

INSERT INTO demo_estadistica VALUES
 ('1020304000','Femenino','Durante el evento','Forzada','Sí','Albergue temporal','No','Medellín'),
 ('1020304001','Masculino','Preventiva / antes del impacto','Voluntaria','No','Vivienda de familiar o tercero','Sí','Bello'),
 ('1020304002','Femenino','Posterior al evento','Forzada','Sí','Arrendamiento','No','Turbo'),
 ('1020304003','Masculino','Durante el evento','Mixta','Sí','Asentamiento informal','No sabe / No responde','Apartadó'),
 ('1020304004','Femenino','Mixta o salidas sucesivas','Forzada','No sabe / No responde','Retorno parcial','Sí','Rionegro'),
 ('1020304005','Masculino','Preventiva / antes del impacto','Por verificar','No','Vivienda propia recuperada','Sí','Medellín'),
 ('1020304006','Femenino','Durante el evento','Voluntaria','Sí','Refugio improvisado','No','Turbo'),
 ('1020304007','Masculino','Posterior al evento','Forzada','Sí','Reasentamiento','No','Bello'),
 ('1020304008','Femenino','Mixta o salidas sucesivas','Mixta','No','Otro','Sí','Apartadó'),
 ('1020304009','Masculino','Durante el evento','Forzada','Sí','Albergue temporal','No sabe / No responde','Rionegro'),
 ('1020304010','Femenino','Preventiva / antes del impacto','Voluntaria','No sabe / No responde','Arrendamiento','Sí','Medellín'),
 ('1020304011','Masculino','Posterior al evento','Por verificar','No','Vivienda de familiar o tercero','No','Turbo');

UPDATE persona p
SET sexo = v.sexo
FROM demo_estadistica v
WHERE p.numero_documento = v.documento;

UPDATE declaracion d
SET datos_declarados = jsonb_set(
      d.datos_declarados,
      '{answers}',
      (d.datos_declarados->'answers') || jsonb_build_object('section-1-8', v.sexo) ||
      CASE WHEN d.datos_declarados->'answers' ? 'section-2-53' THEN
        jsonb_build_object(
          'section-2-55','Antioquia', 'section-2-56',v.municipio,
          'section-2-59',v.momento, 'section-2-60',v.caracter,
          'section-2-61',v.fuera, 'section-2-62',v.alojamiento,
          'section-2-67',v.retorno
        )
      ELSE '{}'::jsonb END
    ),
    version = d.version + 1,
    actualizado_en = clock_timestamp()
FROM persona p, demo_estadistica v
WHERE d.id_persona_declarante = p.id_persona
  AND p.numero_documento = v.documento;

UPDATE desplazamiento ds
SET momento_salida = v.momento,
    caracter_salida = v.caracter,
    permanece_fuera = v.fuera,
    tipo_alojamiento_actual = v.alojamiento,
    puede_retornar = v.retorno,
    id_municipio_origen = (
      SELECT m.id_municipio FROM municipio m
      JOIN departamento dep USING (id_departamento)
      WHERE dep.nombre = 'Antioquia' AND m.nombre = v.municipio
      LIMIT 1
    )
FROM declaracion d
JOIN persona p ON p.id_persona = d.id_persona_declarante
JOIN demo_estadistica v ON v.documento = p.numero_documento
WHERE ds.id_declaracion = d.id_declaracion;
