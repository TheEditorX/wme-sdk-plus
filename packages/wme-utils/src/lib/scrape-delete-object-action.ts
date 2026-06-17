import type { Model } from 'backbone';
import { createEmptyDataModel } from './create-empty-data-model.js';
import type { DataModel } from './data-model.js';
import { runWithModel } from './run-with-model.js';
import { WmeSDK } from 'wme-sdk-typings';
import { MethodInterceptor } from '@wme-enhanced-sdk/method-interceptor';
import { getWindow } from '@wme-enhanced-sdk/utils';
import { captureActions } from './capture-actions.js';

let cachedDataModel: DataModel | null = null;

function getEditingMediator() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const window = getWindow<{ W: any }>();
  return window.W.editingMediator;
}

export function scrapeDeleteObjectAction(sdk: WmeSDK, object: Model, actionName: string) {
  const dataModel = cachedDataModel ??= createEmptyDataModel();
  if (!dataModel) throw new Error('Failed to create empty data model');

  dataModel.repos['venues'].objects['__object'] = object;
  try {
    const [action] = runWithModel(dataModel, () => {
      const isNewInterceptor = MethodInterceptor.mockReturnValueOnce(object, 'isNew', true);
      const isEditingAllowedInterceptor = MethodInterceptor.mockReturnValueOnce(getEditingMediator(), 'isEditingAllowed', true);

      try {
        return captureActions(() => {
          sdk.DataModel.Venues.deleteVenue({ venueId: '__object' });
        }, { model: dataModel });
      } finally {
        isNewInterceptor.restore();
        isEditingAllowedInterceptor.restore();
      }
    });
    if (action.actionName !== actionName) {
      throw new Error(`Unexpected action discovered when tried to resolve ${actionName} action: ${action.actionName}`);
    }
    
    return action.constructor;
  } finally {
    delete dataModel.repos['venues'].objects['__object'];
  }
}
