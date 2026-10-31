import { randomBytes, randomUUID } from 'node:crypto';
import { pool, transaction } from './db.mjs';
import { hashToken, verifyPassword } from './auth.mjs';
import { createSessionStore } from './persistence/session-store.mjs';
import { createRecordStore, createRecordTransaction } from './persistence/record-store.mjs';
import { createEventReader } from './persistence/event-reader.mjs';
import { createStatisticsReader } from './persistence/statistics-reader.mjs';
import { createAttachmentStore } from './persistence/attachment-store.mjs';
import { createSessionService } from './application/session-service.mjs';
import { createRecordService } from './application/record-service.mjs';
import { createAttachmentService } from './application/attachment-service.mjs';
import { createApp } from './http/create-app.mjs';

/** The composition root is the only place that connects application capabilities to PostgreSQL. */
export function createServices({
  database,
  runTransaction,
  passwords = { verify: verifyPassword },
  tokens = { create: () => randomBytes(32).toString('hex'), hash: hashToken },
  newId = randomUUID,
}) {
  const records = createRecordStore(database);
  return {
    sessions: createSessionService({ sessions: createSessionStore(database), passwords, tokens }),
    records: createRecordService({ records, transaction: createRecordTransaction(runTransaction) }),
    events: createEventReader(database),
    attachments: createAttachmentService({
      records,
      files: createAttachmentStore(database),
      newId,
    }),
    statistics: createStatisticsReader(database),
    health: () => database.query('SELECT 1'),
  };
}

export const services = createServices({ database: pool, runTransaction: transaction });

export function composeApp(environment = process.env, dependencies = services) {
  return createApp(dependencies, {
    mode: environment.NODE_ENV,
    trustProxy: environment.TRUST_PROXY,
    origins: [
      'http://localhost:4305',
      'http://127.0.0.1:4305',
      'http://localhost:4310',
      'http://127.0.0.1:4310',
      'http://localhost:' + Number(environment.API_PORT || 4310),
      'http://127.0.0.1:' + Number(environment.API_PORT || 4310),
      ...(environment.APP_ORIGIN || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ],
  });
}
