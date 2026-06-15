import {
  PropertySwapper,
} from '@wme-enhanced-sdk/method-interceptor';
import { getWindow } from '@wme-enhanced-sdk/utils';

/**
 * Minimal interface for a WME data model repository instance, sufficient for
 * action capture operations. Any object exposing an `actionManager.add` method
 * satisfies this contract — including both the live `W.model` and dummy instances
 * created via `W.model.constructor`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DataModelRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionManager: { add: (...args: any[]) => any };
}

function getDefaultModel(): DataModelRepository {
  return getWindow<{ W: { model: DataModelRepository } }>().W.model;
}

export function captureActions(cb: () => void, model?: DataModelRepository) {
  const actions: any[] = [];
  const methodSwapper = new PropertySwapper((model ?? getDefaultModel()).actionManager, 'add');
  methodSwapper.swap((action: any) => {
    actions.push(action);
  });

  try {
    cb();
  } finally {
    methodSwapper.restore();
  }

  return actions;
}

export async function captureAsyncActions(cb: () => Promise<void>, model?: DataModelRepository) {
  const actions: any[] = [];
  const methodSwapper = new PropertySwapper((model ?? getDefaultModel()).actionManager, 'add');
  methodSwapper.swap((action: any) => {
    actions.push(action);
  });

  try {
    await cb();
  } finally {
    methodSwapper.restore();
  }

  return actions;
}
