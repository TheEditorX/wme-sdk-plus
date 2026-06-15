import { DefinePropertyRule, SdkPatcherRule, SdkPatcherRuleOperationArgs } from '@wme-enhanced-sdk/sdk-patcher';
import { getBigJunction } from '../utils/get-big-junction.js';
import { pushUpdateObjectAction } from '../utils/update-object-action.js';

interface UpdateBigJunctionArgs {
  bigJunctionId: number;
  name?: string | null;
}

export default [
  new DefinePropertyRule('DataModel.BigJunctions.updateBigJunction', ({ sdk }: SdkPatcherRuleOperationArgs) => {
    return (args: UpdateBigJunctionArgs) => {
      const bigJunction = getBigJunction(args.bigJunctionId);
      if (!bigJunction) {
        throw new sdk.Errors.DataModelNotFoundError('bigJunction', args.bigJunctionId);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newAttributes: Record<string, any> = {};
      if (args.name !== undefined) newAttributes.name = args.name;

      if (Object.keys(newAttributes).length > 0) {
        pushUpdateObjectAction(bigJunction, newAttributes);
      }
    };
  }, { isFactory: true }),
] as SdkPatcherRule[];
