/**
* File: src/shared/request-context.ts
* Module: shared/context
* Purpose: AsyncLocalStorage-based request context (requestId, tenantId, userId)
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Provides static helpers to set/get per-request metadata
* - Populated by RequestContextMiddleware
*/

import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextState {
  requestId?: string;
  tenantId?: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestContextState>();

export const RequestContext = {
  run<T>(initial: RequestContextState, fn: () => T): T {
    return storage.run(initial, fn);
  },
  get(): RequestContextState | undefined {
    return storage.getStore();
  },
  set(values: Partial<RequestContextState>): void {
    const state = storage.getStore();
    if (!state) return;
    Object.assign(state, values);
  },
};


