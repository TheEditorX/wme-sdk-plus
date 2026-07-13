import { MiddlewareContext } from './middleware-context.js';

export type NextFunction<R> = () => Promise<R | null>;

/**
 * A middleware handler function.
 *
 * To **continue** the chain, call `next()`.
 *
 * To **prevent** further execution you can either:
 * - throw {@link MiddlewarePreventedError}, or
 * - return `null` or `false` (explicit cancellation – no warning emitted), or
 * - simply omit the `next()` call (implicit cancellation – a warning is logged).
 */
export type MiddlewareHandler<D extends object, R> = (
  context: MiddlewareContext<D>,
  next: NextFunction<R>,
) => Promise<void | null | false> | void | null | false;

export type UnregisterFunction = () => void;
