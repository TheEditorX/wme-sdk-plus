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

export interface CaptureActionsOptions {
  model?: DataModelRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionResult?: boolean | ((action: any) => boolean);
}

function getDefaultModel(): DataModelRepository {
  return getWindow<{ W: { model: DataModelRepository } }>().W.model;
}

export function captureActions(cb: () => void, options?: CaptureActionsOptions) {
  const actions: any[] = [];
  const methodSwapper = new PropertySwapper((options?.model ?? getDefaultModel()).actionManager, 'add');
  methodSwapper.swap((action: any) => {
    actions.push(action);
    if (options?.actionResult === undefined) return false;
    if (typeof options.actionResult === 'boolean') return options.actionResult;
    return options.actionResult(action);
  });

  try {
    cb();
  } finally {
    methodSwapper.restore();
  }

  return actions;
}

export async function captureAsyncActions(cb: () => Promise<void>, options?: CaptureActionsOptions) {
  const actions: any[] = [];
  const methodSwapper = new PropertySwapper((options?.model ?? getDefaultModel()).actionManager, 'add');
  methodSwapper.swap((action: any) => {
    actions.push(action);
    if (options?.actionResult === undefined) return false;
    if (typeof options.actionResult === 'boolean') return options.actionResult;
    return options.actionResult(action);
  });

  try {
    await cb();
  } finally {
    methodSwapper.restore();
  }

  return actions;
}
