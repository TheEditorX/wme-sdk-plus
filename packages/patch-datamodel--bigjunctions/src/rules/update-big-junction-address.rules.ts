/* eslint-disable @typescript-eslint/no-explicit-any */
import { DefinePropertyRule, SdkPatcherRule, SdkPatcherRuleOperationArgs } from '@wme-enhanced-sdk/sdk-patcher';
import { getWindow } from '@wme-enhanced-sdk/utils';
import { getBigJunction } from '../utils/get-big-junction.js';
import { scrapeUpdateFeatureAddressActionConstructor } from '../utils/scrape-update-feature-address-action.js';

interface UpdateBigJunctionAddressArgs {
  bigJunctionId: number;
  cityId: number;
}

export default [
  new DefinePropertyRule('DataModel.BigJunctions.updateAddress', ({ sdk }: SdkPatcherRuleOperationArgs) => {
    return async (args: UpdateBigJunctionAddressArgs) => {
      const bigJunction = getBigJunction(args.bigJunctionId);
      if (!bigJunction) {
        throw new sdk.Errors.DataModelNotFoundError('bigJunction', args.bigJunctionId);
      }

      const win = getWindow<{ W: any }>();

      const cityEntity = win.W.model.cities.getObjectById(args.cityId);
      if (!cityEntity) {
        throw new sdk.Errors.DataModelNotFoundError('city', args.cityId);
      }

      const UpdateFeatureAddress = await scrapeUpdateFeatureAddressActionConstructor(sdk);

      const action = new UpdateFeatureAddress(bigJunction, {
        cityID: args.cityId,
        cityName: cityEntity.getName() ?? '',
        countryID: cityEntity.getCountryID(),
        emptyCity: cityEntity.isEmpty(),
        emptyStreet: true,
        houseNumber: undefined,
        stateID: cityEntity.getStateID(),
        streetName: '',
      });

      win.W.model.actionManager.add(action);
    };
  }, { isFactory: true }),
] as SdkPatcherRule[];
