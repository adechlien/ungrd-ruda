import type { StatisticCount, StatisticsSummary } from '../core/models/statistics';
export type StatisticsGroup = 'overview' | 'displacement' | 'current';

export function buildStatistics({totals, breakdowns}: StatisticsSummary) {
  const colors = ['#ffe169','#edc531','#c9a227','#a47e1b'];
  function chart(group:StatisticsGroup, title:string, subtitle:string, values:StatisticCount[], kind:'bar'|'pie'='bar') {
    const total = values.reduce((sum, row) => sum + row.count, 0);
    let offset=0;
    const rows=[...values].sort((a,b)=>b.count-a.count || a.label.localeCompare(b.label)).map(({label,count},i)=>{
      const percent=total ? count/total*100 : 0;
      const start=offset;offset+=percent;
      return {label,count,percent,color:colors[i%colors.length],start,end:offset};
    });
    return {group,title,subtitle,kind,rows,total,max:Math.max(1,...rows.map(r=>r.count)),pie:rows.length?'conic-gradient('+rows.map(r=>`${r.color} ${r.start}% ${r.end}%`).join(',')+')':'none',description:rows.map(r=>`${r.label}: ${r.count}`).join('; ')};
  }
  return {
    metrics:[
      {label:'Eventos',value:totals.events,detail:'Eventos distintos asociados',icon:'calendar-week',tone:'default'},
      {label:'Desplazamientos',value:totals.displacements,detail:'Con fecha de salida válida',icon:'route',tone:'amber'},
      {label:'Declarantes',value:totals.declarants,detail:'Personas únicas por documento',icon:'users',tone:'green'}
    ],
    charts:[
      chart('overview','Desplazamientos por tipo de evento','Cantidad de desplazamientos registrados para cada tipo de evento.',breakdowns.eventTypes),
      chart('overview','Declarantes por sexo','Personas únicas; se toma el dato declarado más reciente.',breakdowns.sex,'pie'),
      chart('overview','Municipios de origen','Desplazamientos por municipio y departamento de origen.',breakdowns.origins),
      chart('displacement','Momento de salida','Relación entre la salida del hogar y el evento.',breakdowns.departureMoment),
      chart('current','Alojamiento actual','Tipo de alojamiento informado tras el desplazamiento.',breakdowns.accommodation),
      chart('current','Razón de no retorno','Razón principal declarada para no retornar.',breakdowns.noReturn,'pie'),
      chart('displacement','Carácter de la salida','Salidas forzadas, voluntarias u otras situaciones declaradas.',breakdowns.departureCharacter),
      chart('displacement','Evolución del evento','Carácter repentino o de lenta evolución del evento.',breakdowns.evolution,'pie')
    ]
  };
}
