import { ApiError } from '../errors.mjs';
import { prepareCapture, assertRecordVersion, recordStatus, toRecord } from '../domain/capture.mjs';

/** @typedef {{list: Function, isOwned: Function, history: Function}} RecordReader */
/** @typedef {(work: (context: object) => Promise<object>) => Promise<object>} RecordTransaction */

/** Capture workflow owns authorization, optimistic concurrency and state transitions. */
export function createRecordService({ records, transaction, now = () => new Date() }) {
  return {
    async list(actor) {
      return (await records.list(actor)).map(toRecord);
    },
    async history(actor, id) {
      if (!(await records.isOwned(actor, id))) throw new ApiError(404, 'Registro no encontrado.');
      return records.history(id);
    },
    async save(actor, id, input, finish = false) {
      const capture = prepareCapture(actor, id, input, finish),
        a = capture.answers;
      return transaction(async (store) => {
        const prior = await store.lock(id);
        assertRecordVersion(actor, prior, input.version);
        let validGeography = true;
        if (finish || prior?.estado === 'terminado')
          for (const [section, dep, mun] of [
            [1, 11, 12],
            [1, 15, 16],
            [2, 25, 26],
            [2, 41, 42],
            [2, 48, 49],
          ]) {
            if (!(await store.municipality(a, section, dep, mun))) {
              validGeography = false;
              if (finish)
                throw new ApiError(422, 'Seleccione un departamento y municipio compatibles.', [
                  { section, field: String(mun), message: 'Municipio inválido.' },
                ]);
            }
          }
        const personId = await store.person(a);
        let eventId = capture.eventId;
        if (eventId) {
          const event = await store.lockEvent(eventId);
          if (!event || String(event.creado_por) !== String(actor.id_funcionario))
            throw new ApiError(422, 'El evento seleccionado no está disponible.');
          if (!(await store.eventShared(eventId, id)) && a['section-2-30'])
            await store.updateEvent(eventId, a);
        } else if (a['section-2-30']) eventId = await store.createEvent(actor, a);
        capture.eventId = eventId ? String(eventId) : null;
        const status = recordStatus(capture, prior, finish, validGeography);
        const row = await store.writeRecord(prior, id, a, {
          id_persona_declarante: personId,
          id_funcionario: actor.id_funcionario,
          id_organizacion_receptora: actor.id_organizacion,
          id_municipio_declaracion: await store.municipality(a, 1, 15, 16),
          estado: status,
          terminado_en: status === 'terminado' ? prior?.terminado_en || now() : null,
          version_registro: (prior?.version_registro || 0) + 1,
          actualizado_en: now(),
        });
        await store.project(id, capture);
        await store.audit(actor, id, row, capture);
        return toRecord({ ...row, snapshot: capture, acta: await store.attachment(id) });
      });
    },
  };
}
