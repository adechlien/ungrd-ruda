import { Injectable, InjectionToken, inject } from '@angular/core';
import type { Issue } from '../../form/model/form-contract';

export class ApiFailure extends Error {
  constructor(
    public status: number,
    message: string,
    public issues: Issue[] = [],
  ) {
    super(message);
  }
}

export const HTTP_TRANSPORT = new InjectionToken<typeof fetch>('HTTP_TRANSPORT', {
  providedIn: 'root',
  factory: () => globalThis.fetch.bind(globalThis),
});

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly transport = inject(HTTP_TRANSPORT);
  async request<T>(path: string, method = 'GET', data?: unknown, signal?: AbortSignal): Promise<T> {
    return this.send<T>(path, {
      method,
      signal,
      headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }
  async upload<T>(path: string, data: Blob): Promise<T> {
    return this.send<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: data,
    });
  }
  private async send<T>(path: string, options: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await this.transport('/api' + path, { ...options, credentials: 'same-origin' });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new ApiFailure(0, 'No se pudo conectar con el servidor.');
    }
    if (response.status === 204) return undefined as T;
    const body = await response
      .json()
      .catch(() => ({ message: 'El servidor no está disponible.' }));
    if (!response.ok)
      throw new ApiFailure(
        response.status,
        body.message || 'No se pudo completar la operación.',
        body.issues || [],
      );
    return body;
  }
}
