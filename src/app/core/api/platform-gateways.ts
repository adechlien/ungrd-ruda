import { InjectionToken, inject } from '@angular/core';
import { ApiClient } from './api-client';
import type { ActaFile, FormRecord, SessionUser, SharedEvent } from '../models/records';
import type { StatisticsSummary } from '../models/statistics';

export interface SessionGateway {
  me(): Promise<SessionUser>;
  login(email: string, password: string): Promise<SessionUser>;
  logout(): Promise<void>;
}
export const SESSION_GATEWAY = new InjectionToken<SessionGateway>('SESSION_GATEWAY', {
  providedIn: 'root',
  factory: () => {
    const http = inject(ApiClient);
    return {
      me: () => http.request<SessionUser>('/auth/me'),
      login: (email, password) =>
        http.request<SessionUser>('/auth/login', 'POST', { email, password }),
      logout: () => http.request<void>('/auth/logout', 'POST'),
    };
  },
});

export interface RecordsGateway {
  list(signal?: AbortSignal): Promise<FormRecord[]>;
  save(record: FormRecord, finish: boolean): Promise<FormRecord>;
}
export const RECORDS_GATEWAY = new InjectionToken<RecordsGateway>('RECORDS_GATEWAY', {
  providedIn: 'root',
  factory: () => {
    const http = inject(ApiClient);
    return {
      list: (signal) => http.request<FormRecord[]>('/forms', 'GET', undefined, signal),
      save: (record, finish) =>
        http.request<FormRecord>(
          '/forms/' + record.id + (finish ? '/finish' : ''),
          finish ? 'POST' : 'PUT',
          record,
        ),
    };
  },
});

export interface EventsGateway {
  list(signal?: AbortSignal): Promise<SharedEvent[]>;
}
export const EVENTS_GATEWAY = new InjectionToken<EventsGateway>('EVENTS_GATEWAY', {
  providedIn: 'root',
  factory: () => {
    const http = inject(ApiClient);
    return { list: (signal) => http.request<SharedEvent[]>('/events', 'GET', undefined, signal) };
  },
});

export interface AttachmentsGateway {
  upload(id: string, file: File): Promise<ActaFile>;
  remove(id: string): Promise<void>;
}
export const ATTACHMENTS_GATEWAY = new InjectionToken<AttachmentsGateway>('ATTACHMENTS_GATEWAY', {
  providedIn: 'root',
  factory: () => {
    const http = inject(ApiClient);
    return {
      upload: (id, file) =>
        http.upload<ActaFile>(
          '/forms/' + id + '/acta?nombre=' + encodeURIComponent(file.name),
          file,
        ),
      remove: (id) => http.request<void>('/forms/' + id + '/acta', 'DELETE'),
    };
  },
});

export interface StatisticsGateway {
  get(signal?: AbortSignal): Promise<StatisticsSummary>;
}
export const STATISTICS_GATEWAY = new InjectionToken<StatisticsGateway>('STATISTICS_GATEWAY', {
  providedIn: 'root',
  factory: () => {
    const http = inject(ApiClient);
    return {
      get: (signal) => http.request<StatisticsSummary>('/statistics', 'GET', undefined, signal),
    };
  },
});
