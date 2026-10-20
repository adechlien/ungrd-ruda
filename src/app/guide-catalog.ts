import { EventOption } from './event-types';
export const GUIDE_OPTIONS: EventOption[] = [
    {
      id: 'flood',
      label: 'Inundación/Avalancha',
      icon: 'wave-sine',
      questions: [
        '¿Cuánto duró el evento o cuánto tiempo lleva el nivel alto?',
        '¿Hubo alerta previa? ¿Qué entidad? ¿Con cuánto tiempo?',
        '¿Su vivienda quedó destruida o inhabitable?',
        '¿Perdió cultivos, animales domésticos o bienes de la unidad productiva? (Art. 1 Ley 2577)',
        '¿Ha sufrido inundaciones anteriores en la misma zona en los últimos 5 años? (degradación progresiva)',
      ],
    },
    { id: 'coastal', label: 'Erosión costera/Degradación lenta', icon: 'ripple', questions: [
      '¿Desde cuándo viene el fenómeno (meses/años)?',
      '¿Cuántos metros ha avanzado hacia su vivienda o terreno?',
      '¿Ha recibido alertas técnicas de CAR, IDEAM o UNGRD?',
      '¿Tenía título de propiedad o posesión sobre el terreno?',
      '¿La fuente de sustento (pesca, cultivo, turismo) también fue afectada?',
    ] },
    { id: 'landslide', label: 'Deslizamiento/Derrumbe', icon: 'mountain', questions: [
      '¿Hubo señales previas (grietas, movimiento del suelo)?',
      '¿Existía estudio de riesgo o amenaza para la zona?',
      '¿El proceso fue gradual o fue un evento súbito?',
      '¿Sufrió pérdidas de semovientes u otros animales?',
    ] },
    { id: 'drought', label: 'Sequía/Desertificación', icon: 'sun', questions: [
      '¿Cuántos meses llevaba la sequía al desplazarse?',
      '¿La fuente de agua para consumo humano se secó?',
      '¿Perdió cultivos o ganado por falta de agua?',
      '¿Hay declaratoria de emergencia por sequía en el municipio?',
    ] },
    { id: 'evacuation', label: 'Evacuación preventiva', icon: 'route', questions: [
      '¿Quién emitió la orden de evacuación? (alcalde / UNGRD / CAR / otro)',
      '¿Con qué plazo fue notificado?',
      '¿Se le indicó si el desplazamiento es temporal o definitivo?',
      '¿Se le garantizó alojamiento, alimentación y transporte?',
      '¿La orden está sustentada en certificación técnica? (Art. 5 Ley 2577)',
    ] },
    { id: 'fire', label: 'Incendio forestal', icon: 'flame', questions: [
      '¿Qué área fue afectada?',
      '¿El incendio alcanzó directamente su vivienda, cultivos o ganado?',
      '¿Se identificó posible responsable? (Si es antrópico, aplica Art. 5 Ley 2577)',
      '¿Hay riesgo de reactivación del incendio?',
    ] },
  ];

export const GUIDE_CODES: Record<string, string[]> = {
 flood: ['FLOOD_DURATION','FLOOD_WARNING','FLOOD_HOUSING','FLOOD_LOSSES','FLOOD_PREVIOUS'],
 coastal: ['COASTAL_START','COASTAL_ADVANCE','COASTAL_WARNINGS','COASTAL_TENURE','COASTAL_LIVELIHOOD'],
 landslide: ['LANDSLIDE_SIGNS','LANDSLIDE_STUDY','LANDSLIDE_EVOLUTION','LANDSLIDE_ANIMALS'],
 drought: ['DROUGHT_DURATION','DROUGHT_WATER','DROUGHT_LOSSES','DROUGHT_EMERGENCY'],
 evacuation: ['EVACUATION_AUTHORITY','EVACUATION_NOTICE','EVACUATION_DURATION','EVACUATION_SUPPORT','EVACUATION_CERTIFICATION'],
 fire: ['FIRE_AREA','FIRE_IMPACT','FIRE_RESPONSIBLE','FIRE_REACTIVATION'],
 other: ['OTHER_DESCRIPTION','OTHER_WARNING','OTHER_IMPACT'],
};
GUIDE_OPTIONS.push({id:'other',label:'Otros eventos',icon:'alert-triangle',questions:['¿Cómo ocurrió el evento?','¿Hubo alertas previas?','¿Cuáles fueron las principales afectaciones?']});
export function guideCode(event: string, index: number): string { return GUIDE_CODES[event]?.[index] || ''; }
export function eventForType(type: string): EventOption['id'] {
 if (['Inundación','Avenida torrencial'].includes(type)) return 'flood';
 if (type === 'Erosión costera') return 'coastal';
 if (['Movimiento en masa','Movimientos en masa'].includes(type)) return 'landslide';
 if (['Sequía / desabastecimiento','Sequía / desabastecimiento de agua','Desertificación / erosión severa','Desertificación y erosión severa del suelo'].includes(type)) return 'drought';
 if (type === 'Incendio forestal') return 'fire';
 if (['Evacuación preventiva','Amenaza de ruina o inminencia de colapso de edificaciones'].includes(type)) return 'evacuation';
 return 'other';
}
