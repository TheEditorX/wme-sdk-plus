import {
  PropertySwapper,
} from '@wme-enhanced-sdk/method-interceptor';
import { getWindow } from '@wme-enhanced-sdk/utils';
import { DataModelRepository } from './capture-actions.js';

function makeModelSwapper(model: DataModelRepository) {
  const win = getWindow<{ W: { model: DataModelRepository } }>();
  const swapper = new PropertySwapper(win.W, 'model');
  swapper.swap(model);
  return swapper;
}

/**
 * Runs a synchronous callback with `W.model` replaced by the given {@linkcode model}
 * instance. The original `W.model` is restored after the callback returns (or throws).
 *
 * @param model - The data model repository instance to use inside the callback.
 * @param cb - The synchronous callback to execute.
 * @returns The return value of {@linkcode cb}.
 */
export function runWithModel<T>(model: DataModelRepository, cb: () => T): T {
  const swapper = makeModelSwapper(model);
  try {
    return cb();
  } finally {
    swapper.restore();
  }
}

/**
 * Runs an asynchronous callback with `W.model` replaced by the given {@linkcode model}
 * instance. The original `W.model` is restored once the callback's promise settles.
 *
 * **Note on async isolation**: Between `await` suspension points, unrelated concurrent
 * tasks may run and will also see the swapped `W.model`. True per-coroutine isolation is
 * not achievable in a browser environment without a mechanism such as Zone.js (heavy) or
 * the not-yet-shipped TC39 `AsyncContext` proposal. For the typical use case — calling SDK
 * methods sequentially inside the callback — this limitation is inconsequential.
 *
 * @param model - The data model repository instance to use inside the callback.
 * @param cb - The asynchronous callback to execute.
 * @returns A promise that resolves with the return value of {@linkcode cb}.
 */
export async function runWithModelAsync<T>(model: DataModelRepository, cb: () => Promise<T>): Promise<T> {
  const swapper = makeModelSwapper(model);
  try {
    return await cb();
  } finally {
    swapper.restore();
  }
}
