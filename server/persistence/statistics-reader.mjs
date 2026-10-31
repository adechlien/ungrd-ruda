export function createStatisticsReader(database) {
  return {
    // Only the current version and the fields used by the indicators enter this query.
    // PostgreSQL returns aggregate rows, never captures, narratives or household data.
    async get(actor) {
      const result = await database.query(
        `
  WITH captures AS MATERIALIZED (
   SELECT r.id_registro,r.actualizado_en,r.estado,e.id_evento_especifico,
    ds.fecha_salida IS NOT NULL AS displaced,
    coalesce(nullif(a.snapshot #>> '{answers,section-1-1}',''),'CC') AS document_type,
    nullif(btrim(a.snapshot #>> '{answers,section-1-2}'),'') AS document,
    a.snapshot #>> '{answers,section-1-8}' AS sex,
    a.snapshot #>> '{answers,section-2-30}' AS event_type,
    CASE WHEN nullif(a.snapshot #>> '{answers,section-2-42}','') IS NOT NULL
     THEN concat_ws(' · ',a.snapshot #>> '{answers,section-2-42}',nullif(a.snapshot #>> '{answers,section-2-41}','')) END AS origin,
    a.snapshot #>> '{answers,section-2-45}' AS departure_moment,
    a.snapshot #>> '{answers,section-2-47}' AS accommodation,
    a.snapshot #>> '{answers,section-2-52}' AS no_return,
    a.snapshot #>> '{answers,section-2-46}' AS departure_character,
    a.snapshot #>> '{answers,section-2-31}' AS evolution
   FROM registro r
   JOIN auditoria_registro a ON a.id_registro=r.id_registro AND a.version_registro=r.version_registro
   LEFT JOIN desplazamiento ds ON ds.id_registro=r.id_registro
   LEFT JOIN evento_especifico e ON e.id_evento_especifico=ds.id_evento_especifico AND e.creado_por=$1
   WHERE r.id_funcionario=$1
  ), people AS (
   SELECT DISTINCT ON (document_type,document) sex
   FROM captures WHERE document IS NOT NULL
   ORDER BY document_type,document,actualizado_en DESC,id_registro
  )
  SELECT 'events' AS key,NULL::text AS label,count(DISTINCT id_evento_especifico)::int AS count
   FROM captures WHERE estado='terminado'
  UNION ALL SELECT 'displacements',NULL,count(*)::int FROM captures WHERE displaced
  UNION ALL SELECT 'declarants',NULL,count(*)::int FROM people
  UNION ALL
   SELECT 'sex',coalesce(nullif(btrim(sex),''),'Sin información'),count(*)::int
   FROM people GROUP BY coalesce(nullif(btrim(sex),''),'Sin información')
  UNION ALL
   SELECT chart.key,coalesce(nullif(btrim(chart.label),''),'Sin información'),count(*)::int
   FROM captures CROSS JOIN LATERAL (VALUES
    ('eventTypes',event_type),('origins',origin),('departureMoment',departure_moment),
    ('accommodation',accommodation),('noReturn',no_return),
    ('departureCharacter',departure_character),('evolution',evolution)
   ) AS chart(key,label)
   WHERE displaced GROUP BY chart.key,coalesce(nullif(btrim(chart.label),''),'Sin información')
 `,
        [actor.id_funcionario],
      );
      const totals = { events: 0, displacements: 0, declarants: 0 };
      const breakdowns = {
        eventTypes: [],
        sex: [],
        origins: [],
        departureMoment: [],
        accommodation: [],
        noReturn: [],
        departureCharacter: [],
        evolution: [],
      };
      for (const { key, label, count } of result.rows) {
        if (Object.hasOwn(totals, key)) totals[key] = count;
        else breakdowns[key].push({ label, count });
      }
      return { totals, breakdowns };
    },
  };
}
