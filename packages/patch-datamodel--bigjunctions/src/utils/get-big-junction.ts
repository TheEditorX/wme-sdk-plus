import { getWindow } from '@wme-enhanced-sdk/utils';

export function getBigJunction(bigJunctionId: string | number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const window = getWindow<{ W: any }>();
  return window.W.model.bigJunctions.getObjectById(bigJunctionId);
}
