import type { FormRecord, SharedEvent } from './form-records.service';
export type StatisticsGroup = 'overview' | 'displacement' | 'current';

export function buildStatistics(records: FormRecord[], events: SharedEvent[]) {
  const latest = [...records].sort((a,b) => b.savedAt.localeCompare(a.savedAt) || a.id.localeCompare(b.id));
  const people = new Map<string, FormRecord>();
  for (const r of latest) {
    const doc = r.answers['section-1-2']?.trim();
    if (doc) { const key = (r.answers['section-1-1'] || 'CC') + ':' + doc; if (!people.has(key)) people.set(key,r); }
  }
  const eventIds = new Set(records.map(r=>r.eventId).filter(Boolean));
  const linkedEvents = events.filter(e=>eventIds.has(e.id));
  const displaced = records.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.answers['section-2-39'] || '') && !Number.isNaN(Date.parse(r.answers['section-2-39'])));
  const colors = ['#ffe169','#edc531','#c9a227','#a47e1b'];
  function chart(group:StatisticsGroup, title:string, subtitle:string, values:string[], kind:'bar'|'pie'='bar') {
    const counts = new Map<string,number>();
    for (const value of values) { const label=value?.trim() || 'Sin información'; counts.set(label,(counts.get(label)||0)+1); }
    let offset=0;
    const rows=[...counts].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).map(([label,count],i)=>{
      const percent=values.length ? count/values.length*100 : 0;
      const start=offset;offset+=percent;
      return {label,count,percent,color:colors[i%colors.length],start,end:offset};
    });
    return {group,title,subtitle,kind,rows,total:values.length,max:Math.max(1,...rows.map(r=>r.count)),pie:rows.length?'conic-gradient('+rows.map(r=>`${r.color} ${r.start}% ${r.end}%`).join(',')+')':'none',description:rows.map(r=>`${r.label}: ${r.count}`).join('; ')};
  }
  const geography=(r:FormRecord)=>r.answers['section-2-42'] ? r.answers['section-2-42']+(r.answers['section-2-41']?' · '+r.answers['section-2-41']:'') : '';
  return {
    metrics:[
      {label:'Eventos',value:linkedEvents.length,detail:'Eventos distintos asociados',icon:'calendar-week',tone:'default'},
      {label:'Desplazamientos',value:displaced.length,detail:'Con fecha de salida informada',icon:'route',tone:'amber'},
      {label:'Declarantes',value:people.size,detail:'Personas únicas por documento',icon:'users',tone:'green'}
    ],
    charts:[
      chart('overview','Desplazamientos por tipo de evento','Cantidad de desplazamientos registrados para cada tipo de evento.',displaced.map(r=>r.answers['section-2-30'])),
      chart('overview','Declarantes por sexo','Personas únicas; se toma el dato declarado más reciente.',[...people.values()].map(r=>r.answers['section-1-8']),'pie'),
      chart('overview','Municipios de origen','Desplazamientos por municipio y departamento de origen.',displaced.map(geography)),
      chart('displacement','Momento de salida','Relación entre la salida del hogar y el evento.',displaced.map(r=>r.answers['section-2-45'])),
      chart('current','Alojamiento actual','Tipo de alojamiento informado tras el desplazamiento.',displaced.map(r=>r.answers['section-2-47'])),
      chart('current','Razón de no retorno','Razón principal declarada para no retornar.',displaced.map(r=>r.answers['section-2-52']),'pie'),
      chart('displacement','Carácter de la salida','Salidas forzadas, voluntarias u otras situaciones declaradas.',displaced.map(r=>r.answers['section-2-46'])),
      chart('displacement','Evolución del evento','Carácter repentino o de lenta evolución del evento.',displaced.map(r=>r.answers['section-2-31']),'pie')
    ]
  };
}
