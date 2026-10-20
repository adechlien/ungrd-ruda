export { SECTION_SCHEMAS, EVENT_PRINCIPALS_BY_TYPE, RUDA_REVISION, FORM_VERSION } from './form-schema';
export { GUIDE_OPTIONS, GUIDE_CODES, guideCode, eventForType } from './guide-catalog';
import { SECTION_SCHEMAS, EVENT_PRINCIPALS_BY_TYPE, FormField } from './form-schema';
import { GUIDE_CODES, eventForType } from './guide-catalog';
export type Answers = Record<string, string>;
export interface Capture { revisionRuda?: number; answers: Answers; story: string; selectedEvent: string; members?: Answers[]; }
export interface Issue { section: number; field: string; message: string; }
export const REPEATED_PREFIXES = ['section-4-animal-','section-5-property-','section-5-asset-'];
export function repeatedKey(key:string):boolean {return REPEATED_PREFIXES.some(prefix=>key.startsWith(prefix));}
export function expandedFields(section:number,fields:FormField[],answers:Answers):FormField[] {
 const first=fields[0];
 if(!first || !repeatedKey(`section-${section}-${first.id}`))return fields;
 const prefix=`section-${section}-${first.id.split('-')[0]}-`;
 const rows=[...new Set([0,...Object.keys(answers).filter(k=>k.startsWith(prefix)).map(k=>Number(k.match(/--(\d+)$/)?.[1]||0))])].sort((a,b)=>a-b);
 return rows.flatMap(row=>fields.map(field=>row?{...field,id:field.id+'--'+row,label:field.label+` (${row})`}:field));
}
export function declarantName(a: Answers): string {
 return ['5','6','3','4'].map(id=>a[`section-1-${id}`]?.trim()).filter(Boolean).join(' ');
}
export function memberNeedsCompletion(m: Answers): boolean { return m['member-review'] === 'Pendiente'; }
export function householdComplete(members: Answers[] = []): boolean {
 return members.length > 0 && members.every(m=>Boolean(m['member-name']?.trim()) && !memberNeedsCompletion(m));
}
/** Prefills identity only; the remaining household information requires a manual review. */
export function syncDeclarant(a: Answers, members: Answers[], previous?: Answers): Answers[] {
 const name=declarantName(a);
 const identity: Answers={
  'member-name':name, 'member-document-type':a['section-1-1'] || '',
  'member-document':a['section-1-2'] || '', 'member-birth':a['section-1-7'] || '',
  'member-gender':a['section-1-8'] === 'Intersexual' ? 'Otro' : a['section-1-8'] || '',
 };
 const index=members.findIndex(m=>m['member-declarant']==='Sí') >= 0
  ? members.findIndex(m=>m['member-declarant']==='Sí')
  : members.findIndex(m=>(identity['member-document'] && m['member-document']===identity['member-document'] && (m['member-document-type']||'CC')===(identity['member-document-type']||'CC')) ||
    (!m['member-document'] && name && m['member-name']?.trim().toLocaleLowerCase('es')===name.toLocaleLowerCase('es')));
 if(index<0) {
  if(!a['section-1-5']?.trim() || !a['section-1-3']?.trim()) return members;
  return [{...identity,'member-relation':'Declarante','member-declarant':'Sí','member-review':'Pendiente'},...members];
 }
 const current=members[index];
 const updated: Answers={...current,'member-declarant':'Sí'};
 const priorIdentity=previous ? {
  'member-name':declarantName(previous),'member-document-type':previous['section-1-1']||'',
  'member-document':previous['section-1-2']||'','member-birth':previous['section-1-7']||'',
  'member-gender':previous['section-1-8']==='Intersexual'?'Otro':previous['section-1-8']||'',
 } : null;
 for(const [key,value] of Object.entries(identity)) {
  if((!current[key] && value) || (priorIdentity && priorIdentity[key as keyof typeof priorIdentity]!==value)) updated[key]=value;
 }
 if(!updated['member-relation']) updated['member-relation']='Declarante';
 if(Object.entries(updated).every(([key,value])=>current[key]===value)) return members;
 return members.map((m,i)=>i===index?updated:m);
}
export function validDocument(type: string, value: string): boolean {
 const rules: Record<string, RegExp> = { CC:/^\d{6,10}$/, TI:/^\d{10,11}$/, RC:/^\d{10,11}$/, NUIP:/^\d{10}$/, CE:/^[A-Z0-9]{6,12}$/i, Pasaporte:/^[A-Z0-9]{6,12}$/i };
 return Boolean(rules[type || 'CC']?.test(value.trim()));
}
export function validBirthDate(value:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=new Date(value+'T00:00:00Z');
 if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==value||parsed>new Date())return false;
 const oldest=new Date();oldest.setFullYear(oldest.getFullYear()-130);
 return parsed>=oldest;
}
export function ethnicApplies(a: Answers): boolean {
 if (a['section-6-applies'] === 'No') return false;
 return a['section-6-applies'] === 'Sí' || a['section-1-22'] === 'Colectiva / comunitaria';
}
export function applicable(section: number, id: string, a: Answers): boolean {
 if (section === 6) {
  if (!ethnicApplies(a)) return false;
  const condition: Record<string,string> = {'cultural-loss-description':'83','community-document':'85','cultural-threat-description':'87','interpreter-language':'89','ethnic-file-number':'90'};
  return !condition[id] || a['section-6-'+condition[id]] === 'Sí';
 }
 if (section === 4 && id === 'license-number') return a['section-4-54'] === 'Sí' && a['section-4-60'] === 'Sí';
 if (section === 4 && id === 'medical-entity') return a['section-4-66'] === 'Sí';
 if (section === 4 && ['humanitarian-entity','humanitarian-date'].includes(id)) return a['section-4-69'] === 'Sí';
 if (section === 5) {
  const condition: Record<string,string> = {'months-no-income':'72','injuries-description':'73','condition-description':'74','psychosocial-entity':'76'};
  if (condition[id]) return a['section-5-'+condition[id]] === (id === 'months-no-income' ? 'No' : 'Sí');
 }
 if (section === 4 && ['55','56','57','58','59','60','employees-affected','license-number'].includes(id)) return a['section-4-54'] === 'Sí';
 if (section === 2 && id === '38') return a['section-2-37'] === 'Otra';
 return true;
}
export function validateCapture(c: Capture, finish = true): Issue[] {
 const issues: Issue[] = []; const a = c.answers;
 const add=(section:number,field:string,message:string)=>issues.push({section,field,message});
 if (!validDocument(a['section-1-1'] || 'CC', a['section-1-2'] || '')) add(1,'2','Ingrese un documento válido del declarante.');
 if (!finish) return issues;
 SECTION_SCHEMAS.forEach((s,si)=>s.groups.forEach(g=>expandedFields(si+1,g.fields,a).forEach(f=>{
  if(f.id.startsWith('member-') || !applicable(si+1,f.id,a)) return;
  const v=a[`section-${si+1}-${f.id}`]?.trim() || '';
  if(!v) { if(f.required && f.id !== '0' && !(si === 0 && f.id === '2')) add(si+1,f.id,`Complete ${f.label}.`); return; }
  if(f.options && !f.options.includes(v)) add(si+1,f.id,`Seleccione una opción válida para ${f.label}.`);
  if(f.type==='number' && (!Number.isFinite(Number(v)) || Number(v)<0 || Number(v)>=1e16 || (['animal-count','asset-count','59','84','months-no-income'].includes(f.id.split('--')[0]) && (!Number.isSafeInteger(Number(v)) || Number(v)>2147483647)))) add(si+1,f.id,`Revise ${f.label}.`);
  if(si===0&&f.id==='7'&&v&&!validBirthDate(v))add(1,f.id,'Fecha de nacimiento del declarante inválida.');
  if(f.type==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) add(si+1,f.id,'Correo inválido.');
  if(f.type==='date' && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)) || new Date(v).toISOString().slice(0,10)!==v)) add(si+1,f.id,`Fecha inválida: ${f.label}.`);
  if(f.type==='time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) add(si+1,f.id,'Hora inválida.');
 })));
 if(!c.story.trim()) add(3,'story','Registre la narración de los hechos.');
 const expected=eventForType(a['section-2-30'] || '');
 if(a['section-2-29'] && !EVENT_PRINCIPALS_BY_TYPE[a['section-2-29']]?.includes(a['section-2-30'] || '')) add(2,'30','Seleccione un evento principal correspondiente al tipo de evento.');
 if(c.selectedEvent!==expected) add(2,'30','Las preguntas guía deben corresponder al tipo de evento.');
 if(!c.members?.length) add(4,'members','Registre al menos un integrante del hogar.');
 const docs=new Set<string>();
 for(const m of c.members || []) {
  if(memberNeedsCompletion(m)) add(4,'members',`Complete los datos de ${m['member-name'] || 'el declarante'} en Miembros del hogar.`);
  if(!m['member-name']?.trim()) add(4,'members','Cada integrante debe tener un nombre.');
  for(const field of SECTION_SCHEMAS[3].groups.find(g=>g.title==='Miembros del hogar')!.fields) {
   if(m[field.id] && field.options && !field.options.includes(m[field.id])) add(4,'members',`Seleccione una opción válida para ${field.label}.`);
  }
  if(m['member-document']) {
   if(!validDocument(m['member-document-type'] || 'CC',m['member-document'])) add(4,'members','Documento de integrante inválido.');
   const key=(m['member-document-type'] || 'CC')+':'+m['member-document'];
   if(docs.has(key)) add(4,'members','No repita el mismo documento en el hogar.'); docs.add(key);
  }
  if(m['member-birth'] && !validBirthDate(m['member-birth'])) add(4,'members','Fecha de nacimiento de integrante inválida.');
 }
 return issues;
}
export function firstIncomplete(c: Capture): number { return Math.min(...validateCapture(c).map(i=>i.section),7) % 7 || 1; }
export function captureProgress(c: Capture): number {
 const keys=SECTION_SCHEMAS.flatMap((s,si)=>s.groups.flatMap(g=>expandedFields(si+1,g.fields,c.answers).filter(f=>!f.id.startsWith('member-') && applicable(si+1,f.id,c.answers)).map(f=>`section-${si+1}-${f.id}`)));
 keys.push(...(GUIDE_CODES[c.selectedEvent] || []).map(code=>`guide-${code}`));
 const done=keys.filter(k=>c.answers[k]?.trim()).length+(c.story.trim()?1:0)+(householdComplete(c.members)?1:0);
 return Math.round(done/(keys.length+2)*100);
}
export function captureStats(c: Capture, section?: number): {answered:number;total:number;percentage:number} {
 const keys=SECTION_SCHEMAS.flatMap((s,si)=>section && section!==si+1?[]:s.groups.flatMap(g=>expandedFields(si+1,g.fields,c.answers).filter(f=>!f.id.startsWith('member-') && applicable(si+1,f.id,c.answers)).map(f=>`section-${si+1}-${f.id}`)));
 if(!section||section===3)keys.push(...(GUIDE_CODES[c.selectedEvent]||[]).map(code=>'guide-'+code));
 let total=keys.length,answered=keys.filter(k=>c.answers[k]?.trim()).length;
 if(!section||section===3){total++;if(c.story.trim())answered++;}
 if(!section||section===4){total++;if(householdComplete(c.members))answered++;}
 return {answered,total,percentage:total?Math.round(answered/total*100):100};
}
