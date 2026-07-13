/* eslint-disable @typescript-eslint/no-explicit-any */

import { WmeSDK } from 'wme-sdk-typings';
import { MiddlewareHandler, NextFunction } from './middleware-handler.js';
import { DeepFrozen, deepFreeze, deepClone, watchFunction, } from '../utils/index.js';
import { MiddlewareContext } from './middleware-context.js';
import { MiddlewareFlowError, MiddlewarePreventedError } from '../errors/index.js';

export class MiddlewareActionRunner<D extends object, R = any> {
  private actionPoint: string;
  private data: D;
  private mutatedData: D;
  private wmeSdk: WmeSDK;
  private handlers: Array<MiddlewareHandler<D, R>>;

  constructor(
    actionPoint: string,
    data: D,
    wmeSdk: WmeSDK,
    handlers: Array<MiddlewareHandler<D, R>>,
  ) {
    this.actionPoint = actionPoint;
    this.data = this.mutatedData = data;
    this.wmeSdk = wmeSdk;
    this.handlers = handlers;
  }

  private getSafeImmutableData(): DeepFrozen<D> {
    return deepFreeze(deepClone(this.data));
  }

  private getSafeMutableData(): D {
    return deepClone(this.mutatedData);
  }

  private createContext(): MiddlewareContext<D> {
    return new MiddlewareContext(
      this.actionPoint,
      this.getSafeMutableData(),
      this.getSafeImmutableData(),
      this.wmeSdk,
    );
  }

  async run(
    finalAction: (processedData: D) => R,
  ): Promise<R | null> {
    let handlerIndex = -1; // Track execution position
    const dispatch = async (currentIndex: number): Promise<R | null> => {
      if (currentIndex <= handlerIndex) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Safety check against calling next() multiple times synchronously
        throw new MiddlewareFlowError('next() called multiple times within the same middleware or improperly nested.');
      }

      handlerIndex = currentIndex;

      if (currentIndex >= this.handlers.length) {
        // End of the chain, execute the final action
        return finalAction(this.mutatedData);
      }
      
      const handler = this.handlers[handlerIndex];

      const context = this.createContext();
      const [next, isNextCalled, lastNextResult] = watchFunction<NextFunction<R>>(() => {
        this.mutatedData = context.data;
        return dispatch(currentIndex + 1);
      });

      try {
        // Execute the current middleware handler
        // Using Promise.resolve to handle both sync and async handlers gracefully
        const handlerResult = await Promise.resolve(handler(
          context,
          next,
        ));

        if (!isNextCalled()) {
          // Returning null or false is treated as an explicit, intentional cancellation.
          if (handlerResult !== null && handlerResult !== false) {
            // Implicit cancellation – the developer may have forgotten to call next().
            console.warn(
              `Middleware handler "${handler.name || "anonymous"}" did not call next(). ` +
              `The middleware chain execution will be stopped. ` +
              `To explicitly prevent execution, throw MiddlewarePreventedError, return null, or return false. ` +
              `To continue the chain, always call next().`,
            );
          }

          return null;
        }

        return await lastNextResult(); // Ensure we're awaiting for the next handler to finish
      } catch (error) {
        if (error instanceof MiddlewarePreventedError) {
          return null;
        }

        throw error;
      }
    }

    // Start the chain execution
    return await dispatch(0);
  }
}
