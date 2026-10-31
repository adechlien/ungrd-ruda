import '@angular/compiler';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnvironmentInjector, EnvironmentInjector, Injector, signal } from '@angular/core';
import { ApiClient, ApiFailure, HTTP_TRANSPORT } from '../../src/app/core/api/api-client';
import {
  SESSION_GATEWAY,
  RECORDS_GATEWAY,
  EVENTS_GATEWAY,
  ATTACHMENTS_GATEWAY,
  STATISTICS_GATEWAY,
} from '../../src/app/core/api/platform-gateways';
import { AuthService } from '../../src/app/core/services/auth.service';
import { FormRecordsService } from '../../src/app/core/services/form-records.service';
import { EventsService } from '../../src/app/core/services/events.service';
import { FormEditorService } from '../../src/app/core/services/form-editor.service';
import { StatisticsService } from '../../src/app/core/services/statistics.service';
import type { FormRecord, SessionUser } from '../../src/app/core/models/records';

const actor = (id: string): SessionUser => ({
  id,
  funcionarioId: id,
  name: id,
  email: id + '@example.com',
  role: 'Funcionario',
  organization: 'UNGRD',
  organizationType: 'UNGRD',
  document: '900001',
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture(
  t: any,
  records: any = {
    list: async () => [],
    save: async (r: FormRecord) => ({ ...r, version: r.version + 1 }),
  },
  extra: any[] = [],
) {
  const user = signal<SessionUser | null>(actor('A'));
  const injector = createEnvironmentInjector(
    [
      { provide: AuthService, useValue: { user } },
      { provide: RECORDS_GATEWAY, useValue: records },
      { provide: EVENTS_GATEWAY, useValue: { list: async () => [] } },
      {
        provide: ATTACHMENTS_GATEWAY,
        useValue: { upload: async () => ({ nombre: 'acta.pdf' }), remove: async () => {} },
      },
      FormRecordsService,
      EventsService,
      FormEditorService,
      ...extra,
    ],
    Injector.NULL as EnvironmentInjector,
  );
  t.after(() => injector.destroy());
  return {
    injector,
    user,
    store: injector.get(FormRecordsService),
    editor: injector.get(FormEditorService),
  };
}

test('Transporte HTTP sustituible: credenciales, JSON, errores y adjuntos binarios', async (t) => {
  const calls: any[] = [];
  const responses = [
    Response.json({ ok: true }),
    Response.json(
      { message: 'Conflicto', issues: [{ section: 1, field: '2', message: 'Revise' }] },
      { status: 409 },
    ),
    new Response(null, { status: 204 }),
    Response.json({ nombre: 'acta.pdf' }),
  ];
  const injector = createEnvironmentInjector(
    [
      ApiClient,
      {
        provide: HTTP_TRANSPORT,
        useValue: async (...args: any[]) => {
          calls.push(args);
          return responses.shift();
        },
      },
    ],
    Injector.NULL as EnvironmentInjector,
  );
  t.after(() => injector.destroy());
  const api = injector.get(ApiClient);
  assert.deepEqual(await api.request('/forms', 'PUT', { version: 1 }), { ok: true });
  assert.equal(calls[0][0], '/api/forms');
  assert.equal(calls[0][1].credentials, 'same-origin');
  assert.equal(calls[0][1].body, '{"version":1}');
  await assert.rejects(
    api.request('/forms'),
    (error: ApiFailure) => error.status === 409 && error.issues[0].section === 1,
  );
  assert.equal(await api.request('/auth/logout', 'POST'), undefined);
  const file = new Blob(['%PDF-1.4']);
  await api.upload('/forms/id/acta', file);
  assert.equal(calls[3][1].body, file);
  assert.equal(calls[3][1].headers['Content-Type'], 'application/octet-stream');
});

test('Sesion: una respuesta inicial tardia no reemplaza el nuevo login', async (t) => {
  const initial = deferred<SessionUser>();
  const injector = createEnvironmentInjector(
    [
      AuthService,
      {
        provide: SESSION_GATEWAY,
        useValue: {
          me: () => initial.promise,
          login: async () => actor('B'),
          logout: async () => {},
        },
      },
    ],
    Injector.NULL as EnvironmentInjector,
  );
  t.after(() => injector.destroy());
  const auth = injector.get(AuthService);
  assert.equal(await auth.login('B', 'password'), true);
  initial.resolve(actor('A'));
  await tick();
  assert.equal(auth.user()?.id, 'B');
  await auth.logout();
  assert.equal(auth.user(), null);
});

test('Registros y eventos: respuestas de una sesion anterior quedan fuera del estado visible', async (t) => {
  const pending = deferred<FormRecord[]>(),
    events = deferred<any[]>();
  const { injector, user, store } = fixture(t, { list: () => pending.promise }, [
    { provide: EVENTS_GATEWAY, useValue: { list: () => events.promise } },
  ]);
  const loading = store.ensureRecords();
  const eventStore = injector.get(EventsService);
  const eventLoading = eventStore.load();
  user.set(actor('B'));
  pending.resolve([{ id: 'privado' } as FormRecord]);
  events.resolve([{ id: 'privado' }]);
  await Promise.all([loading, eventLoading]);
  assert.deepEqual(store.records(), []);
  assert.deepEqual(eventStore.events(), []);
  assert.equal(store.recordsLoading(), false);
});

test('Editor: serializa autoguardados y conserva las ediciones hechas durante una respuesta pendiente', async (t) => {
  const first = deferred<FormRecord>(),
    calls: FormRecord[] = [];
  const { store, editor } = fixture(t, {
    list: async () => [],
    save: (r: FormRecord) => {
      calls.push(r);
      return calls.length === 1 ? first.promise : Promise.resolve({ ...r, version: r.version + 1 });
    },
  });
  await editor.openRecord(store.create());
  editor.setFieldValue(1, '2', '12345678');
  const saving = editor.flush();
  await tick();
  editor.setStory('Edicion posterior');
  const next = editor.flush();
  first.resolve({ ...calls[0], version: 1, story: 'Respuesta anterior' });
  assert.equal(await saving, true);
  assert.equal(await next, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].version, 1);
  assert.equal(calls[1].story, 'Edicion posterior');
  assert.equal(editor.story(), 'Edicion posterior');
  assert.equal(editor.dirty(), false);
});

test('Editor: descartar o cambiar de sesion impide restaurar un registro desde una respuesta tardia', async (t) => {
  const pending = deferred<FormRecord>();
  const { store, editor } = fixture(t, { list: async () => [], save: () => pending.promise });
  await editor.openRecord(store.create());
  editor.setFieldValue(1, '2', '12345678');
  const saving = editor.flush();
  await tick();
  editor.reset();
  const next = store.create();
  await editor.openRecord(next);
  pending.resolve({ ...next, id: 'anterior', version: 1 });
  assert.equal(await saving, false);
  assert.equal(editor.currentRecord()?.id, next.id);
  assert.equal(editor.savedLocallyAt(), null);
});

test('Editor: un fallo permite reintentar y una carga de adjunto tardia no altera otro registro', async (t) => {
  let fail = true;
  const pending = deferred<any>();
  const { store, editor } = fixture(
    t,
    {
      list: async () => [],
      save: async (r: FormRecord) => {
        if (fail) throw new ApiFailure(409, 'Version antigua');
        return { ...r, version: r.version + 1 };
      },
    },
    [{ provide: ATTACHMENTS_GATEWAY, useValue: { upload: () => pending.promise } }],
  );
  await editor.openRecord(store.create());
  editor.setFieldValue(1, '2', '12345678');
  assert.equal(await editor.flush(), false);
  assert.equal(editor.dirty(), true);
  fail = false;
  assert.equal(await editor.flush(), true);
  const upload = editor.uploadActa(new File(['%PDF-1.4'], 'acta.pdf'));
  await tick();
  editor.reset();
  const next = store.create();
  await editor.openRecord(next);
  pending.resolve({ nombre: 'anterior.pdf' });
  await upload;
  assert.equal(editor.currentRecord()?.id, next.id);
  assert.equal(editor.currentRecord()?.acta, undefined);
  assert.equal(editor.uploadingActa(), false);
});

test('Estadisticas: consulta solo su contrato y cancela la respuesta reemplazada', async (t) => {
  const first = deferred<any>();
  let calls = 0;
  const signals: AbortSignal[] = [];
  const { injector } = fixture(t, {}, [
    {
      provide: STATISTICS_GATEWAY,
      useValue: {
        get: (signal: AbortSignal) => {
          signals.push(signal);
          return ++calls === 1 ? first.promise : Promise.resolve({ totals: { records: 2 } });
        },
      },
    },
    StatisticsService,
  ]);
  const stats = injector.get(StatisticsService);
  const older = stats.load();
  await stats.load();
  first.resolve({ totals: { records: 99 } });
  await older;
  assert.equal(signals[0].aborted, true);
  assert.equal(stats.summary()?.totals.records, 2);
  assert.equal(stats.loading(), false);
});
