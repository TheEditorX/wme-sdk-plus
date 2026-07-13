import { MiddlewareRegistry } from '@wme-enhanced-sdk/patch-middleware';

/**
 * Executes the middleware chain for a given action point and returns the
 * (possibly modified) data, or `null` if the chain was prevented.
 *
 * Unlike the bare {@link MiddlewareRegistry.execute} API, this helper
 * guarantees that the returned Promise always settles:
 * - Resolves with the mutated data when the chain runs to completion.
 * - Resolves with `null` when a middleware throws {@link MiddlewarePreventedError}.
 * - Resolves with `null` on any unexpected error (treated as cancellation).
 */
export async function executeMiddlewareChain<D extends object>(
  registry: MiddlewareRegistry,
  actionPoint: string,
  data: D,
): Promise<D | null> {
  let settled = false;
  let processedData: D | undefined;

  try {
    await registry.execute(actionPoint, data, (result: D) => {
      settled = true;
      processedData = result;
      return result;
    });
  } catch {
    return null;
  }

  return settled ? (processedData as D) : null;
}
