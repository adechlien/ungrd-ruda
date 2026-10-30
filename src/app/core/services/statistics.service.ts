import {DestroyRef, Injectable, inject, signal} from '@angular/core';
import type {StatisticsSummary} from '../models/statistics';

@Injectable()
export class StatisticsService {
  readonly summary = signal<StatisticsSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  private controller?: AbortController;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
  }

  async load(): Promise<void> {
    this.controller?.abort();
    const controller = this.controller = new AbortController();
    this.loading.set(true);
    this.error.set('');
    this.summary.set(null);
    try {
      const response = await fetch('/api/statistics', {
        credentials: 'same-origin', signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'No se pudieron cargar las estadísticas.');
      }
      const summary: StatisticsSummary = await response.json();
      if (!controller.signal.aborted) this.summary.set(summary);
    } catch (error) {
      if (!controller.signal.aborted) {
        this.error.set(error instanceof Error && error.message !== 'Failed to fetch'
          ? error.message : 'No se pudo conectar con el servidor. Vuelva a intentar.');
      }
    } finally {
      if (this.controller === controller) this.loading.set(false);
    }
  }
}
