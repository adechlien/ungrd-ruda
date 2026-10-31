import { Injectable, computed, inject, signal } from '@angular/core';
import { RECORDS_GATEWAY } from '../api/platform-gateways';
import { ApiFailure } from '../api/api-client';
import { AuthService } from './auth.service';
import type { ActaFile, FormRecord, SessionUser } from '../models/records';

interface RecordsState {
  owner: SessionUser | null;
  items: FormRecord[];
  ready: boolean;
  loading: boolean;
  saving: boolean;
  error: string;
}
const empty = (owner: SessionUser | null): RecordsState => ({
  owner,
  items: [],
  ready: false,
  loading: false,
  saving: false,
  error: '',
});

@Injectable({ providedIn: 'root' })
export class FormRecordsService {
  private readonly gateway = inject(RECORDS_GATEWAY);
  private readonly auth = inject(AuthService);
  private readonly state = signal<RecordsState>(empty(null));
  readonly records = computed(() => this.visible().items);
  readonly recordsLoading = computed(() => this.visible().loading);
  readonly saving = computed(() => this.visible().saving);
  readonly storageError = computed(() => this.visible().error);
  private visible(): RecordsState {
    const state = this.state();
    return state.owner === this.auth.user() ? state : empty(this.auth.user());
  }
  private scope(owner: SessionUser): void {
    if (this.state().owner !== owner) this.state.set(empty(owner));
  }
  private update(owner: SessionUser, update: (state: RecordsState) => RecordsState): void {
    if (this.auth.user() === owner && this.state().owner === owner) this.state.update(update);
  }
  async ensureRecords(force = false): Promise<void> {
    const owner = this.auth.user();
    if (!owner) return;
    this.scope(owner);
    const state = this.state();
    if (state.loading || (!force && state.ready)) return;
    this.update(owner, (state) => ({ ...state, loading: true, error: '' }));
    try {
      const items = await this.gateway.list();
      this.update(owner, (state) => ({ ...state, items, ready: true }));
    } catch (error) {
      this.update(owner, (state) => ({ ...state, error: (error as Error).message }));
    } finally {
      this.update(owner, (state) => ({ ...state, loading: false }));
    }
  }
  async save(record: FormRecord, finish = false): Promise<FormRecord> {
    const owner = this.auth.user();
    if (!owner) throw new ApiFailure(401, 'Inicie sesión para continuar.');
    this.scope(owner);
    this.update(owner, (state) => ({ ...state, saving: true, error: '' }));
    try {
      const saved = await this.gateway.save(record, finish);
      this.update(owner, (state) => ({
        ...state,
        items: [saved, ...state.items.filter((item) => item.id !== saved.id)],
      }));
      return saved;
    } catch (error) {
      this.update(owner, (state) => ({ ...state, error: (error as Error).message }));
      throw error;
    } finally {
      this.update(owner, (state) => ({ ...state, saving: false }));
    }
  }
  patchAttachment(id: string, acta: ActaFile | null): void {
    const owner = this.auth.user();
    if (owner)
      this.update(owner, (state) => ({
        ...state,
        items: state.items.map((record) => (record.id === id ? { ...record, acta } : record)),
      }));
  }
  create(): FormRecord {
    const now = new Date().toISOString(),
      id = crypto.randomUUID(),
      user = this.auth.user();
    return {
      revisionRuda: 8,
      id,
      status: 'pending',
      createdAt: now,
      savedAt: now,
      activeSection: 1,
      progress: 0,
      story: '',
      selectedEvent: 'other',
      members: [],
      eventId: null,
      version: 0,
      answers: {
        'section-1-0': id,
        'section-1-19': user?.name || '',
        'section-1-20': user?.document || '',
        'section-1-17': user?.organizationType || 'UNGRD',
        'section-6-applies': 'No',
      },
    };
  }
}
