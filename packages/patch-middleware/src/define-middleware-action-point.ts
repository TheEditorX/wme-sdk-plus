/* eslint-disable @typescript-eslint/no-explicit-any */
import { SdkPatcherRule, SdkPatcherRuleOperationArgs } from '@wme-enhanced-sdk/sdk-patcher';
import { MiddlewareRegistry } from './lib/middleware-registry.js';
import { REGISTRY_ARTIFACT } from './consts.js';

export interface DefineMiddlewareActionPointRuleOptions<D extends object> {
  actionPoint: string;
  install: (triggerMiddlewares: (data: D) => Promise<D | null>, artifacts: Record<symbol | string, any>) => ((() => void) | void);
  registryArtifactName?: string | symbol;
}
export class DefineMiddlewareActionPointRule<D extends object> implements SdkPatcherRule {
  private isMiddlewareDefined = false;
  private uninstaller: (() => void) | null = null;
  private registry?: MiddlewareRegistry;
  private artifacts?: Record<symbol | string, any>;

  constructor(private readonly options: DefineMiddlewareActionPointRuleOptions<D>) {}

  private addRegistryEvents() {
    this.registry?.addEventListener('middlewareRegistered', this.handleMiddlewareRegistered as any);
    this.registry?.addEventListener('middlewareUnregistered', this.handleMiddlewareUnregistered as any);
  }

  private removeRegistryEvents() {
    this.registry?.removeEventListener('middlewareRegistered', this.handleMiddlewareRegistered as any);
    this.registry?.removeEventListener('middlewareUnregistered', this.handleMiddlewareUnregistered as any);
  }

  private defineMiddleware(artifacts: Record<symbol | string, any>) {
    if (this.isMiddlewareDefined) return;
    this.uninstaller = this.options.install((data) => {
      if (!this.registry) return Promise.resolve(data);
      return this.registry.execute(this.options.actionPoint, data, (result) => result);
    }, artifacts) || null;
    this.isMiddlewareDefined = true;
  }

  private undefineMiddleware() {
    if (!this.isMiddlewareDefined) return;
    this.uninstaller?.();
    this.isMiddlewareDefined = false;
  }

  private handleMiddlewareRegistered = (event: CustomEvent<{ actionPoint: string }>) => {
    if (event.detail.actionPoint !== this.options.actionPoint) return;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.defineMiddleware(this.artifacts!);
  }

  private handleMiddlewareUnregistered = (event: CustomEvent<{ actionPoint: string }>) => {
    if (event.detail.actionPoint !== this.options.actionPoint) return;
    if (this.registry?.hasListeners(this.options.actionPoint)) return;
    this.undefineMiddleware();
  }

  install({ artifacts }: SdkPatcherRuleOperationArgs) {
    this.artifacts = artifacts;
    this.registry = artifacts[this.options.registryArtifactName ?? REGISTRY_ARTIFACT];
    if (this.registry?.hasListeners(this.options.actionPoint)) this.defineMiddleware(artifacts);
    this.addRegistryEvents();
  }
  uninstall() {
    this.removeRegistryEvents();
    this.undefineMiddleware();
    this.registry = undefined;
  }
}
