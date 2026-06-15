import { DefinePropertyRule, SdkPatcherRule, SdkPatcherRuleOperationArgs } from '@wme-enhanced-sdk/sdk-patcher';
import { getBigJunction } from '../utils/get-big-junction.js';
import { DELETE_BIG_JUNCTION_ACTION } from '../artifact-symbols.js';
import { getWindow } from '@wme-enhanced-sdk/utils';

interface DeleteBigJunctionArgs {
  bigJunctionId: number;
}

export default [
  new DefinePropertyRule('DataModel.BigJunctions.deleteBigJunction', ({ sdk, artifacts }: SdkPatcherRuleOperationArgs) => {
    return (args: DeleteBigJunctionArgs) => {
      const bigJunction = getBigJunction(args.bigJunctionId);
      if (!bigJunction) {
        throw new sdk.Errors.DataModelNotFoundError('bigJunction', args.bigJunctionId);
      }

      const DeleteBigJunction = artifacts[DELETE_BIG_JUNCTION_ACTION];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = getWindow<{ W: any }>().W.model;
      const action = new DeleteBigJunction(bigJunction);
      model.actionManager.add(action);
    };
  }, { isFactory: true }),
] as SdkPatcherRule[];
