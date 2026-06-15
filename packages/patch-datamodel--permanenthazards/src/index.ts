import { DefinePropertyRule, SdkPatcherRule } from '@wme-enhanced-sdk/sdk-patcher';
import { captureAsyncActions, drawFeature, pushUpdateObjectAction } from '@wme-enhanced-sdk/wme-utils';
import { polygon } from '@turf/helpers';
import { AddSchoolZoneArgs } from './lib/args/add-school-zone-args.js';
import { createPermanentHazard } from './lib/create-permanent-hazard.js';
import { UpdateSchoolZoneArgs } from './lib/args/update-school-zone-args.js';
import { getPermanentHazard } from './lib/get-permanent-hazard.js';
import { omitUndefined } from './lib/omit-undefined.js';
import { WmeSDK } from 'wme-sdk-typings';
import { GetSchoolZoneByIdArgs } from './lib/args/get-school-zone-by-id-args.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AddPermanentHazard: any, PermanentHazard: any;

export default [
  {
    async install() {
      const schoolZoneMenuItem = document.querySelector('#drawer wz-menu > wz-menu-sub-menu:nth-child(3) > wz-menu-item:nth-of-type(2)');
      if (!schoolZoneMenuItem || !(schoolZoneMenuItem instanceof HTMLElement))
        throw new Error('Unable to find school zone drawing menu item');

      const [addedAction] = await captureAsyncActions(async () => {
        await drawFeature(
          schoolZoneMenuItem,
          polygon([[[0,0],[0,1],[1,1],[0,0]]]).geometry,
        );
      });

      if (addedAction.actionName !== 'ADD_PERMANENT_HAZARD')
        throw new Error('Unexpected action discovered when tried to resolve AddPermanentHazard action: ' + addedAction.actionName)

      const addedObject = addedAction.object;
      if (!addedObject)
        throw new Error('Unexpected state: Added object does not exist');

      if (addedObject.type !== 'permanentHazard')
        throw new Error('Unexpected state: Expected the added object to be a PermanentHazard instead of ' + addedAction.type);

      AddPermanentHazard = addedAction.constructor;
      PermanentHazard = addedObject.constructor;
    }
  } as SdkPatcherRule,

  new DefinePropertyRule('DataModel.PermanentHazards.addSchoolZone', (args: AddSchoolZoneArgs) => {
    if (!PermanentHazard || !AddPermanentHazard)
      throw new Error('PermanentHazard or AddPermanentHazard are not initialized. Make sure to await the enhancedSDK function before using it.');

    const permanentHazard = createPermanentHazard(
      PermanentHazard,
      AddPermanentHazard,
      {
        type: 9,
        geoJSONGeometry: args.geometry,
        name: args.name,
        speedLimit: args.speedLimit,
        excludedRoadTypes: args.excludedRoadTypes,
      },
    );
    return permanentHazard.getID();
  }),

  new DefinePropertyRule('DataModel.PermanentHazards.updateSchoolZone', ({ sdkInstance }: { sdkInstance: WmeSDK }) => {
    return (args: UpdateSchoolZoneArgs) => {
      const permanentHazard = getPermanentHazard(args.schoolZoneId);
      if (!permanentHazard || permanentHazard.getAttribute('type') !== 9) {
        throw new sdkInstance.Errors.DataModelNotFoundError('permanentHazard.SchoolZone', args.schoolZoneId);
      }
  
      pushUpdateObjectAction(permanentHazard, omitUndefined({
        geoJSONGeometry: args.geometry,
        name: args.name,
        speedLimit: args.speedLimit,
        excludedRoadTypes: args.excludedRoadTypes,
      }));
    };
  }, { isFactory: true }),

  new DefinePropertyRule('DataModel.PermanentHazards.getSchoolZoneById', () => {
    return (args: GetSchoolZoneByIdArgs) => {
      const permanentHazard = getPermanentHazard(args.schoolZoneId);
      if (!permanentHazard || permanentHazard.getAttribute('type') !== 9) {
        return null;
      }
  
      return permanentHazard;
    };
  }, { isFactory: true })
]
