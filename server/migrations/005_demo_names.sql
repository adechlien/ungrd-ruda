-- Renombra únicamente los dos funcionarios de demostración.
UPDATE funcionario f
SET nombre_completo = CASE u.correo
  WHEN 'laura@ruda.example' THEN 'Peter Parker'
  WHEN 'daniel@ruda.example' THEN 'Gwen Stacy'
END
FROM usuario u
WHERE u.id_funcionario = f.id_funcionario
  AND u.correo IN ('laura@ruda.example', 'daniel@ruda.example');

-- Actualiza la captura vigente; el trigger conserva una nueva versión auditada.
UPDATE declaracion d
SET datos_declarados = jsonb_set(d.datos_declarados,
      '{answers,section-1-19}', to_jsonb(f.nombre_completo)),
    version = d.version + 1,
    actualizado_en = clock_timestamp()
FROM funcionario f JOIN usuario u USING (id_funcionario)
WHERE d.id_funcionario = f.id_funcionario
  AND u.correo IN ('laura@ruda.example', 'daniel@ruda.example')
  AND d.datos_declarados->'answers'->>'section-1-19' IS DISTINCT FROM f.nombre_completo;
