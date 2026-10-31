export function createEventReader(database) {
 return {
async list(actor) {
 const r = await database.query(`SELECT e.id_evento_especifico AS id, concat_ws(' · ',p.nombre,coalesce(m.nombre,'Ubicación pendiente')) AS nombre,
 p.nombre AS tipo,t.nombre AS categoria,m.nombre AS municipio,d.nombre AS departamento,e.vereda_barrio_sector AS sector,e.direccion,
 e.fecha_inicio::text AS fecha,to_char(e.hora_inicio,'HH24:MI') AS hora,
 count(DISTINCT r.id_registro)::int AS declarations,count(DISTINCT r.id_registro)::int AS "myDeclarations",count(DISTINCT h.id_hogar)::int AS households,
 (SELECT count(DISTINCT identity)::int FROM (
   SELECT pe.tipo_documento||':'||pe.numero_documento AS identity FROM registro r2 JOIN persona pe ON pe.id_persona=r2.id_persona_declarante JOIN desplazamiento ds2 USING(id_registro) WHERE ds2.id_evento_especifico=e.id_evento_especifico AND r2.estado='terminado' AND r2.id_funcionario=$1
   UNION SELECT CASE WHEN nullif(mh.numero_documento,'') IS NULL THEN 'member:'||mh.id_miembro_hogar ELSE coalesce(mh.tipo_documento,'CC')||':'||mh.numero_documento END FROM registro r2 JOIN desplazamiento ds2 USING(id_registro) JOIN hogar h2 USING(id_registro) JOIN miembro_hogar mh USING(id_hogar) WHERE ds2.id_evento_especifico=e.id_evento_especifico AND r2.estado='terminado' AND r2.id_funcionario=$1
 ) people) AS "affectedPeople",
 jsonb_agg(DISTINCT jsonb_build_object('id',r.id_registro,'name',trim(concat_ws(' ',rd.primer_nombre,rd.demas_nombres,rd.primer_apellido,rd.segundo_apellido)),'document',pe.numero_documento,'status','completed','updatedAt',r.actualizado_en)) AS records
 FROM evento_especifico e JOIN desplazamiento ds USING(id_evento_especifico) JOIN registro r USING(id_registro)
 LEFT JOIN registro_declarante rd USING(id_registro) LEFT JOIN persona pe ON pe.id_persona=r.id_persona_declarante LEFT JOIN hogar h USING(id_registro)
 LEFT JOIN evento_principal p USING(id_evento_principal) LEFT JOIN tipo_evento t USING(id_tipo_evento)
 LEFT JOIN municipio m ON m.id_municipio=e.id_municipio LEFT JOIN departamento d ON d.id_departamento=m.id_departamento
 WHERE r.estado='terminado' AND r.id_funcionario=$1 AND e.creado_por=$1
 GROUP BY e.id_evento_especifico,p.nombre,t.nombre,m.nombre,d.nombre ORDER BY e.creado_en DESC`, [actor.id_funcionario]);
 return r.rows;
},
 };
}
