import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import { EVENTS_GATEWAY } from '../api/platform-gateways';
import { AuthService } from './auth.service';
import type { SessionUser, SharedEvent } from '../models/records';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly gateway = inject(EVENTS_GATEWAY);
  private readonly auth = inject(AuthService);
  private readonly state = signal<{
    owner: SessionUser | null;
    items: SharedEvent[];
    ready: boolean;
    loading: boolean;
    error: string;
  }>({ owner: null, items: [], ready: false, loading: false, error: '' });
  readonly events = computed(() =>
    this.state().owner === this.auth.user() ? this.state().items : [],
  );
  readonly error = computed(() =>
    this.state().owner === this.auth.user() ? this.state().error : '',
  );
  readonly loading = computed(
    () => this.state().owner === this.auth.user() && this.state().loading,
  );
  private controller?: AbortController;
  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
  }
  async load(force = false): Promise<void> {
    const owner = this.auth.user();
    if (!owner) return;
    const previous = this.state();
    if (!force && previous.owner === owner && (previous.ready || previous.loading)) return;
    this.controller?.abort();
    const controller = (this.controller = new AbortController());
    this.state.set({
      owner,
      items: previous.owner === owner ? previous.items : [],
      ready: false,
      loading: true,
      error: '',
    });
    try {
      const events = await this.gateway.list(controller.signal);
      if (this.auth.user() !== owner || controller !== this.controller) return;
      const items = events.map((event) => ({
        ...event,
        myDeclarations: Number(event.myDeclarations || 0),
        households: Number(event.households || 0),
        declarations: Number(event.declarations || 0),
        affectedPeople: Number(event.affectedPeople ?? event.declarations ?? 0),
        records: Array.isArray(event.records) ? event.records : [],
        sector: event.sector ?? null,
        direccion: event.direccion ?? null,
        hora: event.hora ?? null,
      }));
      this.state.set({ owner, items, ready: true, loading: false, error: '' });
    } catch (error) {
      if (
        this.auth.user() === owner &&
        controller === this.controller &&
        !controller.signal.aborted
      )
        this.state.update((state) => ({
          ...state,
          loading: false,
          error: (error as Error).message,
        }));
    }
  }
}
