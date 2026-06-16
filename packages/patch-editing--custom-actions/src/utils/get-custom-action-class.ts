import { Action } from '../types/action.js';
import { CustomActionPayload } from '../types/index.js';
import { getWindow } from '@wme-enhanced-sdk/utils';

export interface CustomSdkActionConstructor {
  new (payload: CustomActionPayload): Action;
}

let cachedCustomActionClass: CustomSdkActionConstructor | null = null;

function getActionClass(): typeof Action | null {
  try {
    const window = getWindow<{ require(module: 'Waze/Action/MultiAction'): typeof Action }>();
    const MutliAction: typeof Action = window.require('Waze/Action/MultiAction');
    const CompositeAction: typeof Action = Object.getPrototypeOf(MutliAction);
    const ActionClass: typeof Action = Object.getPrototypeOf(CompositeAction);
    return ActionClass;
  } catch {
    return null;
  }
}

function createCustomActionClass(): CustomSdkActionConstructor {
  const ActionClass = getActionClass();
  if (!ActionClass) 
    throw new Error('Failed to resolve Action class from Waze SDK');

  const CustomSdkAction = class CustomSdkAction extends (ActionClass as any) {
    protected actionName = 'CUSTOM_SDK_ACTION';
    protected shouldSerialize = false;

    private _payload: CustomActionPayload;
    private _resolvedObjects: unknown[] | null = null;

    constructor(payload: CustomActionPayload) {
      super();
      this._payload = payload;
      this.actionName = payload.actionName ?? this.actionName;
      this._description = payload.description;
      this.generateDescription = () => {
        this._description = payload.description;
      };
    }

    doAction(_model: unknown): boolean {
      this._payload.do();
      return true;
    }

    undoAction(_model: unknown): void {
      this._payload.undo?.();
    }

    redoAction(_model: unknown): void {
      if (this._payload.redo) {
        this._payload.redo();
      } else {
        this._payload.do();
      }
    }

    undoSupported(): boolean {
      return !!this._payload.undo;
    }

    private _getResolvedObjects(): unknown[] {
      if (this._resolvedObjects) return this._resolvedObjects;
      const window = getWindow<{ W: any }>();
      const W = window.W;
      this._resolvedObjects = this._payload.affectedObjects
        .map((item) => {
          const repo = W.model.getRepository(item.objectType);
          return repo?.getObjectById(item.objectId);
        })
        .filter(Boolean);
      return this._resolvedObjects;
    }

    accept(model: unknown): void {
      this._getResolvedObjects();
      super.accept?.(model);
    }

    getFocusFeatures(): unknown[] {
      return this._getResolvedObjects();
    }

    getAffectedUniqueIds(): string[] {
      return this._getResolvedObjects().map((obj: any) => obj.getUniqueID());
    }
  };

  return CustomSdkAction as unknown as CustomSdkActionConstructor;
}

export function getCustomActionClass(): CustomSdkActionConstructor {
  if (!cachedCustomActionClass)
    cachedCustomActionClass = createCustomActionClass();
  return cachedCustomActionClass;
}