/* eslint-disable @typescript-eslint/no-explicit-any */
import { getWindow } from '@wme-enhanced-sdk/utils';

function createUpdateObjectAction(object: any, newAttributes: any) {
  const window = getWindow<{ require(module: 'Waze/Action/UpdateObject'): any }>();
  const UpdateObject = window.require('Waze/Action/UpdateObject');
  return new UpdateObject(object, newAttributes);
}

export function pushUpdateObjectAction(object: any, newAttributes: any) {
  const window = getWindow<{ W: any }>();
  window.W.model.actionManager.add(createUpdateObjectAction(object, newAttributes));
}
