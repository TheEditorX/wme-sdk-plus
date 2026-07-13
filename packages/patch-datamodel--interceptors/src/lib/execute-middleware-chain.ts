import { MiddlewareRegistry } from '@wme-enhanced-sdk/patch-middleware';

/**
 * Executes the middleware chain for a given action point and returns the
 * (possibly modified) data, or `null` if the chain was prevented.
 *
 * The chain is considered prevented when any middleware:
 * - throws {@link MiddlewarePreventedError},
 * - returns `null` or `false`, or
 * - omits the `next()` call.
 */
export function executeMiddlewareChain<D extends object>(
  registry: MiddlewareRegistry,
  actionPoint: string,
  data: D,
): Promise<D | null> {
  return registry.execute(actionPoint, data, (processedData) => processedData);
}
