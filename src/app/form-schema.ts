// Fuente oficial: docs/referencias/RUDAM_F002_v8.xlsx
export const RUDA_REVISION = 8;
export const FORM_VERSION = 5;
// Esquema del formulario
export type FieldType = 'text' | 'date' | 'time' | 'email' | 'number' | 'select' | 'textarea';
export interface FormField { id: string; label: string; type: FieldType; required?: boolean; options?: string[]; hint?: string; }
export interface FormGroup { title: string; description?: string; fields: FormField[]; }
export interface SectionSchema { title: string; subtitle: string; groups: FormGroup[]; }

const yesNo = ['Sí', 'No', 'No sabe / No responde'];
const q = (id: string, label: string, type: FieldType = 'text', options?: string[], required = false, hint?: string): FormField => ({ id, label, type, options, required, hint });

const climateEvents = [
  'Ascenso del nivel del mar', 'Erosión costera', 'Derretimiento acelerado de glaciares',
  'Acidificación y calentamiento de los océanos', 'Expansión de enfermedades tropicales',
];
const disasterEvents = [
  'Helada', 'Tormenta eléctrica', 'Vendaval', 'Ciclón tropical', 'Granizada',
  'Actividad volcánica', 'Sismo', 'Tsunami', 'Erosión fluvial', 'Erosión costera',
  'Diapirismo', 'Avenida torrencial', 'Inundación', 'Sequía / desabastecimiento de agua',
  'Incendio forestal', 'Movimientos en masa', 'Derrames', 'Fugas', 'Explosión',
  'Incendio', 'Colapso estructural', 'Accidentes mineros asociados a la minería', 'Accidentes en transporte',
  'Estampidas', 'Colapso de infraestructura por aglomeraciones', 'Paro',
  'Flujos migratorios', 'Amenaza de ruina o inminencia de colapso de edificaciones', 'Epidemias',
  'Plagas', 'Pandemia', 'Fitosanitarios',
];
const environmentalEvents = [
  'Desertificación y erosión severa del suelo', 'Contaminación crítica y colapso pesquero',
  'Contaminación de la calidad del aire', 'Otro',
];
const allEventPrincipals = [...new Set([...climateEvents, ...disasterEvents, ...environmentalEvents])];

/** Catálogo RUDA v8: la pregunta 29 limita las respuestas disponibles en la 30. */
export const EVENT_PRINCIPALS_BY_TYPE: Record<string, string[]> = {
  'Cambio climático': climateEvents,
  'Desastres': disasterEvents,
  'Ambiental': environmentalEvents,
  'Mixto': allEventPrincipals,
  'Por determinar': ['Otro'],
};

export const SECTION_SCHEMAS: SectionSchema[] = [
  {
    title: 'Declaración', subtitle: 'Datos del declarante y de la declaración', groups: [
      { title: 'Identificación del declarante', fields: [
        q('0', 'Identificador único de la declaración', 'text', undefined, true, 'Identificador único generado por el sistema'),
        q('1', 'Tipo de documento', 'select', ['CC', 'CE', 'TI', 'RC', 'NUIP', 'Pasaporte'], true), q('2', 'Número de documento', 'text', undefined, true),
        q('3', 'Primer apellido', 'text', undefined, true), q('4', 'Segundo apellido', 'text', undefined, true), q('5', 'Primer nombre', 'text', undefined, true), q('6', 'Demás nombres'),
        q('7', 'Fecha de nacimiento', 'date', undefined, true), q('8', 'Sexo', 'select', ['Femenino', 'Masculino', 'Intersexual', 'Otro', 'Prefiere no responder'], true),
        q('9', 'Dirección de residencia o correspondencia', 'text', undefined, true), q('10', 'Barrio o vereda de residencia'),
        q('11', 'Departamento de residencia', 'select', undefined, true), q('12', 'Municipio de residencia', 'select', undefined, true), q('13', 'Teléfono'), q('14', 'Correo electrónico', 'email'),
      ]},
      { title: 'Lugar de la declaración', fields: [
        q('15', 'Departamento', 'select', undefined, true), q('16', 'Municipio', 'select', undefined, true),
        q('17', 'Entidad receptora', 'select', ['Coordinación de Gestión del Riesgo', 'Personería municipal', 'Defensoría del Pueblo', 'Procuraduría General de la Nación', 'Autoridad ambiental territorial', 'UNGRD', 'Ministerio de Ambiente', 'Otro'], true),
        q('18', 'Dirección', 'text', undefined, true), q('19', 'Nombre del funcionario receptor', 'text', undefined, true), q('20', 'Identificación del funcionario', 'text', undefined, true),
        q('21', 'Fecha de la declaración', 'date', undefined, true), q('22', 'Tipo de declaración', 'select', ['Individual', 'Hogar / familiar', 'Colectiva / comunitaria'], true),
      ]},
    ],
  },
  {
    title: 'Evento', subtitle: 'Datos del evento y del desplazamiento', groups: [
      { title: 'Datos del evento que generó el desplazamiento', fields: [
        q('23', 'Fecha de inicio', 'date', undefined, true), q('24', 'Hora', 'time'), q('25', 'Departamento', 'select', undefined, true), q('26', 'Municipio', 'select', undefined, true),
        q('27', 'Vereda, barrio o sector afectado'), q('28', 'Dirección'),
        q('29', 'Tipo de evento', 'select', Object.keys(EVENT_PRINCIPALS_BY_TYPE), true),
        q('30', 'Evento principal', 'select', allEventPrincipals, true, 'Las opciones dependen del tipo de evento seleccionado.'),
        q('31', 'Evolución del evento', 'select', ['Repentino (horas/días)', 'Lenta evolución (semanas/meses/años)', 'Mixto'], true), q('32', 'Autoridad o entidad que emitió la alerta'),
        q('33', '¿Se emitió declaratoria oficial de calamidad pública o situación de desastre?', 'select', ['Sí', 'No', 'En trámite'], true),
        q('34', 'Número del decreto de calamidad pública (si aplica)'),
      ]},
      { title: 'Certificación de origen del evento y relación causal', fields: [
        q('35', 'Fecha de solicitud de certificación', 'date', undefined, true),
        q('36', 'Fecha de emisión de la certificación', 'date', undefined, true),
        q('37', 'Entidad de apoyo', 'select', ['CAR regional', 'MADS', 'ANLA', 'IDEAM', 'Otra'], true),
        q('38', 'Si otra, ¿cuál?'),
      ]},
      { title: 'Datos del desplazamiento', fields: [
        q('39', 'Fecha de salida del hogar o residencia habitual', 'date', undefined, true), q('40', 'Hora', 'time'),
        q('41', 'Departamento de origen', 'select', undefined, true), q('42', 'Municipio de origen', 'select', undefined, true),
        q('43', 'Vereda, barrio o sector de origen'), q('44', 'Dirección de origen', 'text', undefined, true),
        q('45', 'Momento de la salida respecto del evento', 'select', ['Preventiva / antes del impacto', 'Durante el evento', 'Posterior al evento', 'Mixta o salidas sucesivas'], true),
        q('46', 'Carácter preliminar de la salida', 'select', ['Forzada', 'Voluntaria', 'Mixta', 'Por verificar'], true),
        q('47', 'Tipo de alojamiento actual', 'select', ['Albergue temporal', 'Vivienda de familiar o tercero', 'Arrendamiento', 'Asentamiento informal', 'Refugio improvisado', 'Retorno parcial', 'Vivienda propia recuperada', 'Reasentamiento', 'Hotel', 'Otro'], true),
        q('48', 'Departamento actual', 'select', undefined, true), q('49', 'Municipio actual', 'select', undefined, true),
        q('50', 'Vereda, barrio o sector actual'), q('51', 'Dirección actual'),
        q('52', 'Razón principal de no retorno', 'select', ['Persistencia del riesgo', 'Vivienda destruida o inhabitable', 'Falta de servicios básicos', 'Falta de medios de vida', 'Orden de evacuación vigente', 'Afectación ambiental persistente', 'Otra (objetos de alto valor personal o sentimental)']),
      ]},
    ],
  },
  { title: 'Narración de los hechos', subtitle: 'Narración libre y preguntas guía por tipo de evento', groups: [] },
  {
    title: 'Caracterización del hogar', subtitle: 'Hogar, animales, unidades productivas y necesidades básicas', groups: [
      { title: 'Identificación del hogar', fields: [q('53', 'Número de formulario RUD (si aplica)')] },
      { title: 'Miembros del hogar', description: 'Registre los datos de cada integrante. Este bloque puede duplicarse para añadir más personas.', fields: [
        q('member-name', 'Apellidos y nombres', 'text', undefined, true), q('member-document-type', 'Tipo de documento', 'select', ['CC', 'CE', 'TI', 'RC', 'NUIP', 'Pasaporte']), q('member-document', 'Número de documento'), q('member-birth', 'Fecha de nacimiento', 'date'),
        q('member-gender', 'Género', 'select', ['Femenino', 'Masculino', 'Otro', 'Prefiere no responder']), q('member-civil', 'Estado civil'), q('member-occupation', 'Ocupación previa'), q('member-occupation-place', 'Lugar de ocupación previa'), q('member-schooling', 'Escolaridad'), q('member-vote', '¿Tenía inscrita su cédula para votar?', 'select', yesNo), q('member-vote-place', 'Lugar de inscripción'), q('member-study', '¿Estudiaba?', 'select', yesNo), q('member-study-place', 'Lugar de estudio'), q('member-work', '¿Trabajaba?', 'select', yesNo), q('member-work-place', 'Lugar de trabajo o empleador'), q('member-sisben', 'Nivel Sisbén'), q('member-eps', 'EPS de salud'), q('member-pregnant', 'Gestante o lactante', 'select', ['Sí','No']), q('member-head', 'Mujer cabeza de familia', 'select', ['Sí','No']), q('member-ethnicity', 'Etnia'), q('member-disability', 'Discapacidad'), q('member-relation', 'Relación con el declarante'),
      ]},
      { title: 'Animales domésticos desplazados', fields: [q('animal-species', 'Especie'), q('animal-count', 'Cantidad', 'number'), q('animal-condition', 'Condición actual'), q('animal-vet', '¿Requiere atención veterinaria?', 'select', yesNo), q('animal-notes', 'Observaciones', 'textarea')]},
      { title: 'Unidades productivas afectadas', fields: [
        q('54', '¿Tenía unidad productiva en el lugar de origen?', 'select', ['Sí','No'], true), q('55', 'Tipo de unidad productiva', 'select', ['Finca / parcela', 'Comercio', 'Microempresa', 'Pesca artesanal', 'Artesanía', 'Ganadería', 'Otro'], true),
        q('56', 'Tenencia', 'select', ['Propietario', 'Arrendatario', 'Poseedor', 'Comunero / colectivo', 'Otro'], true), q('57', 'Ingreso mensual previo (SMMLV)', 'number', undefined, true),
        q('58', '¿Puede operar en el lugar actual?', 'select', ['Sí, parcialmente', 'No', 'En evaluación'], true), q('59', 'Empleados distintos a la familia', 'number', undefined, true), q('employees-affected', '¿Los empleados fueron afectados?', 'select', ['Sí','No']), q('60', '¿Tenía licencia o permiso ambiental?', 'select', ['Sí', 'No', 'No aplica']), q('license-number', 'Número de licencia o permiso ambiental'),
      ]},
      { title: 'Necesidades básicas insatisfechas', fields: [
        q('61', 'Alimentación / seguridad alimentaria', 'select', ['Satisfecha', 'Insatisfecha', 'Parcial'], true), q('62', 'Agua potable en el lugar actual', 'select', ['Satisfecha', 'Insatisfecha', 'Parcial'], true),
        q('63', 'Refugio / alojamiento', 'select', ['Vivienda digna', 'Albergue temporal', 'Improvisado / intemperie', 'Casa de familiar o tercero'], true), q('64', 'Vivienda propia o posesión de buena fe en origen', 'select', ['Sí, con título', 'Sí, posesión de buena fe', 'No'], true),
        q('65', 'Vestimenta y enseres básicos', 'select', ['Satisfecha', 'Insatisfecha', 'Parcial'], true), q('66', 'Atención médica recibida', 'select', ['Sí', 'No', 'En trámite'], true), q('medical-entity', 'Entidad que brindó atención médica'), q('67', 'Acceso a educación de NNA', 'select', ['Sí', 'No', 'No aplica'], true),
        q('68', 'Saneamiento básico', 'select', ['Satisfecho', 'Insatisfecho', 'Parcial'], true), q('69', '¿Recibió atención humanitaria?', 'select', ['Sí', 'No', 'En gestión'], true), q('humanitarian-entity', 'Entidad de atención humanitaria'), q('humanitarian-date', 'Fecha de atención humanitaria', 'date'),
      ]},
    ],
  },
  {
    title: 'Bienes y patrimonio', subtitle: 'Bienes, medios de vida y afectaciones de salud', groups: [
      { title: 'Bienes inmuebles', fields: [q('property-type', 'Tipo de inmueble'), q('property-identifier', 'Identificador'), q('property-use', 'Uso principal'), q('property-tenure', 'Tenencia'), q('property-state', 'Estado posterior al evento'), q('property-value', 'Valor aproximado ($COP)', 'number'), q('property-title', '¿Tiene título?', 'select', yesNo)]},
      { title: 'Bienes muebles y semovientes', fields: [q('asset-description', 'Descripción'), q('asset-count', 'Cantidad', 'number'), q('asset-state', 'Estado posterior al evento'), q('asset-value', 'Valor aproximado', 'number'), q('asset-rescued', '¿Fue rescatado?', 'select', yesNo), q('asset-notes', 'Observaciones', 'textarea')]},
      { title: 'Ingresos y actividad económica pre-evento', fields: [
        q('70', 'Ingreso mensual total del hogar', 'number', undefined, true), q('income-smmlv', 'Ingreso equivalente en SMMLV', 'number'), q('71', 'Fuente principal de ingreso', 'select', ['Agricultura', 'Pesca', 'Comercio', 'Empleo formal', 'Trabajo informal', 'Transferencia social', 'Otro'], true),
        q('72', '¿Continúa percibiendo ingresos?', 'select', ['Sí, parcialmente', 'No'], true), q('months-no-income', 'Meses sin ingresos', 'number'),
      ]},
      { title: 'Afectaciones de salud física y psicosocial', fields: [q('73', '¿Algún miembro resultó herido o fallecido?', 'select', ['Sí','No'], true), q('injuries-description', 'Descripción de miembros heridos o fallecidos', 'textarea'), q('74', '¿Hay enfermedad crónica o condición preexistente?', 'select', ['Sí','No'], true), q('condition-description', 'Descripción de enfermedad o condición', 'textarea'), q('75', '¿Hay síntomas de afectación psicosocial?', 'select', ['Sí', 'No', 'Sin evaluación'], true), q('76', '¿Han recibido atención psicosocial?', 'select', ['Sí', 'No', 'Solicitada pero no recibida'], true), q('psychosocial-entity', 'Entidad de atención psicosocial')]},
    ],
  },
  {
    title: 'Módulo étnico-colectivo', subtitle: 'Para comunidades étnicas o desplazamientos colectivos', groups: [
      { title: 'Identificación de la comunidad y territorio colectivo', fields: [q('77', 'Nombre de la comunidad o pueblo étnico', 'text', undefined, true), q('78', 'Tipo de territorio', 'select', ['Resguardo indígena', 'Territorio colectivo de comunidades negras', 'Tierra raizal', 'Comunidad ROM / gitana', 'Palenque', 'Sin territorio titulado'], true), q('79', 'Resolución o acto de reconocimiento'), q('80', '¿Municipio PDET?', 'select', ['Sí','No'], true), q('81', 'Representante o autoridad que actúa', 'text', undefined, true), q('representative-role', 'Cargo del representante'), q('representative-document', 'Documento del representante')]},
      { title: 'Relación territorial y vínculo cultural', fields: [q('82', 'Relación de la comunidad con el territorio afectado', 'textarea', undefined, true), q('83', '¿Pérdida de acceso a sitios sagrados o culturales?', 'select', ['Sí','No'], true), q('cultural-loss-description', 'Descripción de pérdida de acceso cultural', 'textarea'), q('84', 'Hogares de la comunidad desplazados', 'number', undefined, true), q('whole-community', '¿Se desplazó la totalidad de la comunidad?', 'select', ['Sí','No']), q('85', '¿Las autoridades propias emitieron acta?', 'select', ['Sí','No'], true), q('community-document', 'Referencia del acta o comunicado'), q('86', '¿Tiene plan de vida o salvaguarda vigente?', 'select', ['Sí', 'No', 'En formulación'], true), q('87', '¿El evento amenaza la continuidad cultural?', 'select', ['Sí', 'No', 'En evaluación'], true), q('cultural-threat-description', 'Descripción de amenaza a la continuidad cultural', 'textarea')]},
      { title: 'Seguimiento y atención especializada', fields: [q('88', 'Entidad de seguimiento', 'select', ['Personería', 'Defensoría Regional', 'Ambas'], true), q('89', '¿Requiere intérprete en lengua nativa?', 'select', ['Sí','No'], true), q('interpreter-language', 'Lengua del intérprete'), q('90', '¿UNGRD abrió el módulo étnico en RUDA?', 'select', ['Sí','No'], true), q('ethnic-file-number', 'Número de expediente')]},
    ],
  },
];

// Datos del modal de portada
export const COVER_INFO = {
  title: 'Registro Único de Declaración',
  subtitle: 'Registro Único de Desplazamiento Ambiental (RUDA)',
  description: 'Instrumento para recibir y organizar la información necesaria para la declaración, identificación, caracterización, verificación y eventual incorporación de personas, hogares, comunidades o grupos sociales en el RUDA.',
  code: 'F-RUDA-001', version: '5', effectiveDate: '7 de julio de 2026', law: 'Ley 2577 del 29 de mayo de 2026',
  complementaryRules: 'Ley 387 de 1997 · Ley 1448 de 2011 · Ley 1523 de 2012 · Decreto 2569 de 2000',
  jurisprudence: 'Corte Constitucional, Sentencia T-123 de 2024',
  internationalLaw: 'Principios Rectores de los Desplazamientos Internos, ONU (E/CN.4/1998/53/Add.2)',
  responsibleEntity: 'UNGRD — Unidad Nacional para la Gestión del Riesgo de Desastres',
};

export const COVER_DEFINITIONS = [
  { term: 'Desplazado(a) interno(a) por desastre', definition: 'Persona, grupo o comunidad obligada a salir de su hogar por efectos graves de factores ambientales, cambio climático o desastres naturales, sin cruzar una frontera internacional.', source: 'Ley 2577 de 2026, arts. 1 y 2', updated: true },
  { term: 'RUDA', definition: 'Registro Único de Desplazamiento Ambiental a cargo de la UNGRD para inscripción, caracterización, seguimiento y evaluación del goce efectivo de derechos.', source: 'Ley 2577 de 2026, art. 3', updated: true },
  { term: 'Evento de lenta evolución', definition: 'Fenómeno ambiental o climático de deterioro gradual y acumulativo que alcanza un umbral crítico e impone la salida temporal o definitiva.', source: 'Ley 2577 de 2026, art. 2', updated: true },
  { term: 'Evacuación preventiva', definition: 'Salida ordenada por autoridad competente antes de que el evento cause daño efectivo, con el fin de proteger la vida e integridad.', source: 'Ley 2577 de 2026, art. 2', updated: true },
  { term: 'Unidad productiva', definition: 'Sistema de producción o actividad económica afectada que constituía fuente de ingresos o sustento del hogar.', source: 'Ley 2577 de 2026, art. 1', updated: true },
  { term: 'Certificación técnica UNGRD', definition: 'Documento que acredita la ocurrencia y origen del evento y su nexo causal con el desplazamiento.', source: 'Ley 2577 de 2026, art. 5', updated: true },
  { term: 'Desplazamiento masivo o comunitario', definition: 'Evento que afecta simultáneamente a varias familias u hogares de una misma zona, comunidad o territorio colectivo.', source: 'Ley 2577 de 2026, arts. 1 y 3', updated: true },
  { term: 'Damnificado(a)', definition: 'Persona o familia afectada por un desastre que sufre pérdidas o daños y requiere atención, aunque no necesariamente abandone su residencia.', source: 'Ley 1523 de 2012, art. 4' },
  { term: 'Desplazado(a) por conflicto armado', definition: 'Persona obligada a abandonar su residencia por hechos del conflicto armado. Se registra en el RUV, no en el RUDA.', source: 'Leyes 387 de 1997 y 1448 de 2011' },
  { term: 'Reparación integral', definition: 'Conjunto de medidas de restitución, indemnización, rehabilitación, satisfacción y garantías de no repetición.', source: 'Ley 2577 de 2026, art. 4' },
  { term: 'Retorno voluntario', definition: 'Regreso libre al lugar de origen cuando las causas han cesado y existen condiciones de seguridad, dignidad y sostenibilidad.', source: 'Principio 28 Deng/ONU' },
  { term: 'Reasentamiento', definition: 'Reubicación en un lugar distinto al de origen cuando el retorno resulta inviable o peligroso.', source: 'Ley 2577 de 2026, arts. 1 y 4' },
];

export const REPAIR_COMPONENTS = [
  { name: 'Restitución', description: 'Retorno voluntario, seguro y digno; recuperación de vivienda, tierras y medios de vida.', source: 'Art. 4(3) Ley 2577; Principio 28 Deng' },
  { name: 'Indemnización', description: 'Compensación por daño emergente, lucro cesante y daño moral o al proyecto de vida.', source: 'Art. 4 Ley 2577; Código Civil, art. 1614' },
  { name: 'Rehabilitación', description: 'Atención médica, psicosocial y física para restablecer la salud y el proyecto de vida.', source: 'Art. 4, par. 4(1), Ley 2577' },
  { name: 'Satisfacción', description: 'Medidas simbólicas, reconocimiento y memoria, especialmente para comunidades étnicas y colectivos.', source: 'Principio 29 Deng; T-123 de 2024' },
  { name: 'Garantías de no repetición', description: 'Reubicación definitiva, obras de mitigación y medidas estructurales de política pública.', source: 'Art. 4, par. 2 y 3, Ley 2577' },
  { name: 'Reasentamiento definitivo', description: 'Vivienda digna cuando el retorno no es posible y existía título o posesión de buena fe.', source: 'Art. 4(1) Ley 2577; T-123 de 2024' },
];

export const LEGAL_REFERENCES = [
  { category: 'Ley', title: 'Ley 2577 del 29 de mayo de 2026', detail: 'Medidas para la protección y atención del desplazamiento por factores ambientales, cambio climático y desastres naturales.', publication: 'Diario Oficial No. 53.509' },
  { category: 'Ley', title: 'Ley 387 de 1997', detail: 'Prevención del desplazamiento forzado y atención, protección y estabilización socioeconómica.', publication: 'Diario Oficial No. 43.091' },
  { category: 'Ley', title: 'Ley 1448 de 2011', detail: 'Atención, asistencia y reparación integral a víctimas del conflicto armado interno.', publication: 'Diario Oficial No. 48.096' },
  { category: 'Ley', title: 'Ley 1523 de 2012', detail: 'Política Nacional de Gestión del Riesgo de Desastres.', publication: 'Diario Oficial No. 48.411' },
  { category: 'Decreto', title: 'Decreto 2569 de 2000', detail: 'Reglamentación relacionada con desplazamiento masivo y atención institucional.', publication: 'Presidencia de la República' },
  { category: 'Jurisprudencia', title: 'Sentencia T-123 de 2024', detail: 'Protección constitucional frente al desplazamiento por factores ambientales.', publication: 'Corte Constitucional' },
  { category: 'Internacional', title: 'Principios Rectores de los Desplazamientos Internos', detail: 'Principios Deng 6, 9, 28 y 29 sobre prevención, protección, retorno y soluciones duraderas.', publication: 'ONU, E/CN.4/1998/53/Add.2' },
];
