import { polygon } from '@turf/helpers';
import { SdkPatcherRule, SdkPatcherRuleOperationArgs } from '@wme-enhanced-sdk/sdk-patcher';
import { captureAsyncActions, drawFeature, scrapeDeleteObjectAction } from '@wme-enhanced-sdk/wme-utils';
import { ADD_BIG_JUNCTION_ACTION, BIG_JUNCTION_DM, DELETE_BIG_JUNCTION_ACTION } from '../artifact-symbols.js';

export default [
  {
    async install(args: SdkPatcherRuleOperationArgs) {
      const drawBigJunctionMenuItem = document.querySelector('#drawer wz-menu > wz-menu-sub-menu:nth-child(1) > wz-menu-item:nth-of-type(4)');
      if (!drawBigJunctionMenuItem || !(drawBigJunctionMenuItem instanceof HTMLElement))
        throw new Error('Unable to find school zone drawing menu item');

      const [addedAction] = await captureAsyncActions(async () => {
        await drawFeature(
          drawBigJunctionMenuItem,
          polygon([[[0,0],[0,1],[1,1],[0,0]]]).geometry,
        );
      });
      if (addedAction.actionName !== 'ADD_BIG_JUNCTION')
        throw new Error('Unexpected action discovered when tried to resolve AddBigJunction action: ' + addedAction.actionName)

      const addedObject = addedAction.bigJunction;
      if (!addedObject)
        throw new Error('Unexpected state: Added object does not exist');

      if (addedObject.type !== 'bigJunction')
        throw new Error('Unexpected state: Expected the added object to be a BigJunction instead of ' + addedObject.type);

      const deletedActionConstructor = scrapeDeleteObjectAction(args.sdk, addedObject, 'DELETE_BIG_JUNCTION');

      return {
        [BIG_JUNCTION_DM]: addedObject.constructor,
        [ADD_BIG_JUNCTION_ACTION]: addedAction.constructor,
        [DELETE_BIG_JUNCTION_ACTION]: deletedActionConstructor,
      };
    },
  }
] as SdkPatcherRule[];
