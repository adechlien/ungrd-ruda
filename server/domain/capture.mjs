import {ApiError} from '../errors.mjs';
import {validateCapture, captureProgress, firstIncomplete, eventForType, GUIDE_CODES, SECTION_SCHEMAS, repeatedKey} from '../generated/contract.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const knownKeys = new Set(SECTION_SCHEMAS.flatMap((s, si) => s.groups.flatMap(g => g.fields.map(f => `section-${si + 1}-${f.id}`))));
knownKeys.add('section-6-applies');
Object.values(GUIDE_CODES).flat().forEach(code => knownKeys.add('guide-' + code));

export function sanitize(input) {
 if (input?.revisionRuda !== 8) throw new ApiError(409, 'El formulario usa una revisión anterior. Recargue la página para usar RUDA v8.');
 if (!input.answers || Array.isArray(input.answers) || typeof input.answers !== 'object') throw new ApiError(400, 'Registro inválido.');
 const answers = {};
 for (const [key, value] of Object.entries(input.answers)) {
  const repeated=key.match(/^(.*)--(\d+)$/);
  const allowed=knownKeys.has(key) || (repeated && Number(repeated[2])>=2 && Number(repeated[2])<=100 && knownKeys.has(repeated[1]) && repeatedKey(repeated[1]));
  if (!allowed || typeof value !== 'string' || value.length > 10000) throw new ApiError(400, 'Respuesta no admitida.');
  answers[key] = value.trim();
 }
 if (typeof input.story !== 'string' || input.story.length > 100000 || !Array.isArray(input.members) || input.members.length > 100) throw new ApiError(400, 'Narración o integrantes inválidos.');
 const memberFields = new Set(SECTION_SCHEMAS[3].groups.find(g => g.title === 'Miembros del hogar').fields.map(f => f.id));
 memberFields.add('member-declarant'); memberFields.add('member-review');
 const members = input.members.map(m => {
  if (!m || typeof m !== 'object' || Array.isArray(m)) throw new ApiError(400, 'Integrante inválido.');
  const result = {};
  for (const [k, v] of Object.entries(m)) {
   if (!memberFields.has(k) || typeof v !== 'string' || v.length > 1000) throw new ApiError(400, 'Datos de integrante inválidos.');
   result[k] = v.trim();
  }
  return result;
 });
 if (input.eventId != null && (!/^[1-9]\d{0,18}$/.test(String(input.eventId)) || BigInt(input.eventId)>9223372036854775807n)) throw new ApiError(400, 'Evento inválido.');
 return { revisionRuda: 8, answers, story: input.story, selectedEvent: eventForType(answers['section-2-30'] || ''), members, eventId: input.eventId ? String(input.eventId) : null };
}

export function toRecord(row) {
 const capture = row.snapshot;
 return { ...capture, acta:row.acta||null, revisionRuda: 8, versionFormato: row.version_formato, id: row.id_registro, status: row.estado === 'terminado' ? 'completed' : 'pending', createdAt: row.creado_en.toISOString(), savedAt: row.actualizado_en.toISOString(), finishedAt: row.terminado_en?.toISOString() || null, version: row.version_registro, activeSection: firstIncomplete(capture), progress: captureProgress(capture) };
}

export function prepareCapture(actor, id, input, finish) {
 if (!uuid.test(id)) throw new ApiError(400, 'Identificador de registro inválido.');
 const capture = sanitize(input), a = capture.answers;
 a['section-1-0'] = id; a['section-1-19'] = actor.nombre_completo; a['section-1-20'] = actor.documento;
 const issues = validateCapture(capture, finish);
 if (issues.length) throw new ApiError(422, issues[0].message, issues);
 return capture;
}

export function assertRecordVersion(actor, prior, version) {
 if (prior && String(prior.id_funcionario) !== String(actor.id_funcionario)) throw new ApiError(404, 'Registro no encontrado.');
 if (prior && version !== prior.version_registro) throw new ApiError(409, 'El registro cambió en otra sesión. Recárguelo antes de guardar.');
 if (!prior && version && version !== 0) throw new ApiError(409, 'No se encontró la versión del registro.');
}

export function recordStatus(capture, prior, finish, validGeography) {
 return finish || (prior?.estado === 'terminado' && validGeography && !validateCapture(capture).length) ? 'terminado' : 'borrador';
}
