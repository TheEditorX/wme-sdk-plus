import { getWindow } from '@wme-enhanced-sdk/utils';
import { DataModel } from './data-model.js';

function getLiveDataModel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = getWindow<{ W: any }>();
  if (!win.W || !win.W.model)
    throw new Error('Live WME data model is not accessible');

  return win.W.model;
}

export function createEmptyDataModel(): DataModel {
  const liveModel = getLiveDataModel();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DataModelConstructor = liveModel.constructor as any;
  return new DataModelConstructor();
}
