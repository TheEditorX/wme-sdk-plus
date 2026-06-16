import { DefinePropertyRule } from '@wme-enhanced-sdk/sdk-patcher';
import { getCustomActionClass } from './utils/get-custom-action-class.js';
import { CustomActionPayload } from './types/index.js';
import { getWindow } from '@wme-enhanced-sdk/utils';

export default [
  new DefinePropertyRule(
    'Editing.doCustomAction',
    (payload: CustomActionPayload) => {
      const window = getWindow<{ W: any }>();
      const CustomSdkAction = getCustomActionClass();
      const action = new CustomSdkAction(payload);
      window.W.model.actionManager.add(action);
    },
  ),
];


