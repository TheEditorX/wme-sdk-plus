/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DefinePropertyRule,
  SdkPatcherRule,
} from '@wme-enhanced-sdk/sdk-patcher';
import { MiddlewareRegistry } from './lib/middleware-registry.js';
import { REGISTRY_ARTIFACT } from './consts.js';
import updateRequests_addComment_middleware from './middlewares/updateRequests/addComment.js';
import closures_save_middleware from './middlewares/closures/save.js';
import { MiddlewareHandler } from './lib/middleware-handler.js';

// ── Public API ────────────────────────────────────────────────────────────────
export { MiddlewareRegistry } from './lib/middleware-registry.js';
export { REGISTRY_ARTIFACT } from './consts.js';
export {
  MiddlewareError,
  MiddlewareFlowError,
  MiddlewarePreventedError,
} from './errors/index.js';
export { DefineMiddlewareActionPointRule } from './define-middleware-action-point.js';
export type {
  DefineMiddlewareActionPointRuleOptions,
} from './define-middleware-action-point.js';
export type {
  MiddlewareHandler,
  NextFunction,
  UnregisterFunction,
} from './lib/middleware-handler.js';
export { MiddlewareContext } from './lib/middleware-context.js';

export default [
  {
    install: ({ sdk }) => {
      return {
        [REGISTRY_ARTIFACT]: new MiddlewareRegistry(sdk),
      };
    },
  } as SdkPatcherRule,
  new DefinePropertyRule(
    'Events.registerMiddleware',
    ({ artifacts }: any) =>
      (actionPoint: string, handler: MiddlewareHandler<any, any>) => {
        const registry: MiddlewareRegistry = artifacts[REGISTRY_ARTIFACT];
        if (!registry) throw new Error('Middleware registry not found in artifacts');
        return registry?.register(actionPoint, handler);
      },
    { isFactory: true }
  ),
  updateRequests_addComment_middleware,
  ...closures_save_middleware,
];
