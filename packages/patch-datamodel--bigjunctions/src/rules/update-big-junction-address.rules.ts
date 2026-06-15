/* eslint-disable @typescript-eslint/no-explicit-any */
import { DefinePropertyRule, SdkPatcherRule, SdkPatcherRuleOperationArgs } from '@wme-enhanced-sdk/sdk-patcher';
import { getWindow } from '@wme-enhanced-sdk/utils';
import { getBigJunction } from '../utils/get-big-junction.js';
import { scrapeUpdateFeatureAddressActionConstructor } from '../utils/scrape-update-feature-address-action.js';

interface UpdateBigJunctionAddressArgs {
  bigJunctionId: number;
  streetId: number;
  houseNumber?: string | null;
}

export default [
  new DefinePropertyRule('DataModel.BigJunctions.updateAddress', ({ sdk }: SdkPatcherRuleOperationArgs) => {
    return async (args: UpdateBigJunctionAddressArgs) => {
      const bigJunction = getBigJunction(args.bigJunctionId);
      if (!bigJunction) {
        throw new sdk.Errors.DataModelNotFoundError('bigJunction', args.bigJunctionId);
      }

      const win = getWindow<{ W: any }>();

      const streetEntity = win.W.model.streets.getObjectById(args.streetId);
      if (!streetEntity) {
        throw new sdk.Errors.DataModelNotFoundError('street', args.streetId);
      }

      const cityEntity = win.W.model.cities.getObjectById(streetEntity.getAttribute('cityID'));
      if (!cityEntity) {
        throw new sdk.Errors.DataModelNotFoundError('city', streetEntity.getAttribute('cityID'));
      }

      const UpdateFeatureAddress = await scrapeUpdateFeatureAddressActionConstructor(sdk);

      const action = new UpdateFeatureAddress(bigJunction, {
        cityID: streetEntity.getAttribute('cityID'),
        cityName: cityEntity.getName() ?? '',
        countryID: cityEntity.getCountryID(),
        emptyCity: cityEntity.isEmpty(),
        emptyStreet: !streetEntity.getName(),
        houseNumber: args.houseNumber ?? null,
        stateID: cityEntity.getStateID(),
        streetName: streetEntity.getName() ?? '',
      });

      win.W.model.actionManager.add(action);
    };
  }, { isFactory: true }),
] as SdkPatcherRule[];
