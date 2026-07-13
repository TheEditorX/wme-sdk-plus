/* eslint-disable @typescript-eslint/no-explicit-any */
import { MiddlewareError } from '../errors/index.js';
import { MiddlewareHandler, UnregisterFunction } from './middleware-handler.js';
import { MiddlewareActionRunner } from './middleware-action-runner.js';
import { WmeSDK } from 'wme-sdk-typings';

interface MiddlewareRegistration<D extends object = any, R = any> {
  handler: MiddlewareHandler<D, R>;
}

export class MiddlewareRegistry extends EventTarget {
  private middleware = new Map<string, MiddlewareRegistration[]>();
  private wmeSdk: WmeSDK;

  constructor(wmeSdk: WmeSDK) {
    super();
    this.wmeSdk = wmeSdk;
  }

  /**
   * Registers a middleware handler for a specific action point.
   * @template D The data type for the action point
   * @template R The return type for the action point
   * @param actionPoint The identifier for the action (e.g., 'closures.save').
   * @param handler The middleware function to execute.
   * @returns An UnregisterFunction to remove this specific middleware.
  */
  register<D extends object, R = any>(
    actionPoint: string,
    handler: MiddlewareHandler<D, R>,
  ): UnregisterFunction {
    if (typeof handler !== 'function') {
      throw new MiddlewareError('Middleware handler must be a function.');
    }

    const handlers = this.middleware.get(actionPoint) || [];
    const registration: MiddlewareRegistration<D, R> = { handler };
    handlers.push(registration);
    this.middleware.set(actionPoint, handlers);

    this.dispatchEvent(new CustomEvent('middlewareRegistered', {
      detail: {
        actionPoint,
      },
    }));

    let unregistered = false;
    const unregister = () => {
      if (unregistered) return; // Prevent multiple calls

      const currentHandlers = this.middleware.get(actionPoint);
      if (!currentHandlers) return;

      const index = currentHandlers.indexOf(registration);
      if (index === -1) return;

      currentHandlers.splice(index, 1);
      if (currentHandlers.length === 0)
        this.middleware.delete(actionPoint);

      unregistered = true;
      this.dispatchEvent(new CustomEvent('middlewareUnregistered', {
        detail: {
          actionPoint,
        },
      }));
    };

    return unregister;
  }

  async execute<D extends object, R = any>(
    actionPoint: string,
    initialContextData: D,
    finalAction: (processedData: D) => R,
  ): Promise<R | null> {
    const handlers = this.middleware.get(actionPoint) || [];

    const runner = new MiddlewareActionRunner<D, R>(
      actionPoint,
      initialContextData,
      this.wmeSdk,
      handlers.map((registration) => registration.handler),
    );
    return await runner.run(finalAction);
  }

  hasListeners(actionPoint: string): boolean {
    return this.middleware.has(actionPoint) && (this.middleware.get(actionPoint) || []).length > 0;
  }
}
