/* eslint-disable @typescript-eslint/no-explicit-any */
import { SdkPatcherRule, SdkPatcherRuleOperationArgs } from '@wme-enhanced-sdk/sdk-patcher';
import { MiddlewareRegistry, REGISTRY_ARTIFACT } from '@wme-enhanced-sdk/patch-middleware';
import { getWindow } from '@wme-enhanced-sdk/utils';
import { RepositoryInterceptor } from './repository-interceptor.js';

export interface RepositoryInterceptorConfig {
  /** Key on `W.model` for the Backbone Collection to intercept. */
  repositoryKey: string;
  /** Full action point name for the `added` event. */
  addedActionPoint: string;
  /** Full action point name for the `changed` event. */
  changedActionPoint: string;
  /** Full action point name for the `removed` event. */
  removedActionPoint: string;
}

/**
 * Creates a {@link SdkPatcherRule} that lazily enables/disables a
 * {@link RepositoryInterceptor} for a single WME data-model repository.
 *
 * The interceptor is activated as soon as at least one middleware is registered
 * for any of the three action points and disabled again when all registrations
 * are removed, keeping overhead at zero when no consumer is active.
 */
export function createRepositoryInterceptorRule(
  config: RepositoryInterceptorConfig,
): SdkPatcherRule {
  return ({ artifacts }: SdkPatcherRuleOperationArgs): (() => void) | void => {
    const registry: MiddlewareRegistry | undefined = artifacts[REGISTRY_ARTIFACT];
    if (!registry) return;

    const win = getWindow<{ W?: { model?: Record<string, any> } }>();
    const repository: any = win.W?.model?.[config.repositoryKey];
    if (!repository) return;

    const interceptor = new RepositoryInterceptor(
      repository,
      registry,
      config.addedActionPoint,
      config.changedActionPoint,
      config.removedActionPoint,
    );

    const actionPoints = [
      config.addedActionPoint,
      config.changedActionPoint,
      config.removedActionPoint,
    ] as const;

    const handleRegistered = (event: CustomEvent<{ actionPoint: string }>) => {
      if (!actionPoints.includes(event.detail.actionPoint)) return;
      interceptor.enable();
    };

    const handleUnregistered = (event: CustomEvent<{ actionPoint: string }>) => {
      if (!actionPoints.includes(event.detail.actionPoint)) return;
      if (actionPoints.some((ap) => registry.hasListeners(ap))) return;
      interceptor.disable();
    };

    registry.addEventListener('middlewareRegistered', handleRegistered as EventListener);
    registry.addEventListener('middlewareUnregistered', handleUnregistered as EventListener);

    // Enable immediately if a middleware is already registered.
    if (actionPoints.some((ap) => registry.hasListeners(ap))) {
      interceptor.enable();
    }

    return () => {
      registry.removeEventListener('middlewareRegistered', handleRegistered as EventListener);
      registry.removeEventListener('middlewareUnregistered', handleUnregistered as EventListener);
      interceptor.disable();
    };
  };
}
