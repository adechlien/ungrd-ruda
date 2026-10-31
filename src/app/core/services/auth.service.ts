import { Injectable, inject, signal } from '@angular/core';
import { SESSION_GATEWAY } from '../api/platform-gateways';
import { ApiFailure } from '../api/api-client';
import type { SessionUser } from '../models/records';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly gateway = inject(SESSION_GATEWAY);
  private readonly userState = signal<SessionUser | null>(null);
  readonly user = this.userState.asReadonly();
  readonly loading = signal(true);
  readonly error = signal('');
  private revision = 0;
  constructor() {
    void this.bootstrap();
  }
  private async bootstrap(): Promise<void> {
    const revision = ++this.revision;
    try {
      const user = await this.gateway.me();
      if (revision === this.revision) this.userState.set(user);
    } catch (error) {
      if (revision === this.revision && !(error instanceof ApiFailure && error.status === 401))
        this.error.set((error as Error).message);
    } finally {
      if (revision === this.revision) this.loading.set(false);
    }
  }
  async login(email: string, password: string): Promise<boolean> {
    const revision = ++this.revision;
    this.loading.set(true);
    this.error.set('');
    try {
      const user = await this.gateway.login(email, password);
      if (revision !== this.revision) return false;
      this.userState.set(user);
      return true;
    } catch (error) {
      if (revision === this.revision) this.error.set((error as Error).message);
      return false;
    } finally {
      if (revision === this.revision) this.loading.set(false);
    }
  }
  async logout(): Promise<void> {
    await this.gateway.logout();
    ++this.revision;
    this.userState.set(null);
    this.loading.set(false);
    this.error.set('');
  }
}
