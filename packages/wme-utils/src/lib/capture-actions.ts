import {
  PropertySwapper,
} from '@wme-enhanced-sdk/method-interceptor';
import { getWindow } from '@wme-enhanced-sdk/utils';
import { DataModel } from './data-model.js';

export interface CaptureActionsOptions {
  model?: DataModel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionResult?: boolean | ((action: any) => boolean);
}

function getDefaultModel(): DataModel {
  return getWindow<{ W: { model: DataModel } }>().W.model;
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
