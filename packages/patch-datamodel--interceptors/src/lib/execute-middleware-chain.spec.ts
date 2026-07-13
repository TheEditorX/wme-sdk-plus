import { MiddlewareRegistry, MiddlewarePreventedError } from '@wme-enhanced-sdk/patch-middleware';
import { executeMiddlewareChain } from './execute-middleware-chain.js';

describe('executeMiddlewareChain', () => {
  let registry: MiddlewareRegistry;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registry = new MiddlewareRegistry(null as any);
  });

  test('resolves with the original data when no middlewares are registered', async () => {
    const data = { value: 'hello' };
    const result = await executeMiddlewareChain(registry, 'test.action', data);
    expect(result).toEqual(data);
  });

  test('resolves with mutated data when a middleware modifies it', async () => {
    const data = { value: 'hello' };
    registry.register('test.action', (ctx, next) => {
      ctx.data.value = 'world';
      next();
    });
    const result = await executeMiddlewareChain(registry, 'test.action', data);
    expect(result?.value).toBe('world');
  });

  test('resolves with null when a middleware throws MiddlewarePreventedError', async () => {
    registry.register('test.action', () => {
      throw new MiddlewarePreventedError();
    });
    const result = await executeMiddlewareChain(registry, 'test.action', { value: 'x' });
    expect(result).toBeNull();
  });

  test('resolves with null when a middleware returns null (explicit cancellation)', async () => {
    registry.register('test.action', () => null);
    const result = await executeMiddlewareChain(registry, 'test.action', { value: 'x' });
    expect(result).toBeNull();
  });

  test('resolves with null when a middleware returns false (explicit cancellation)', async () => {
    registry.register('test.action', () => false);
    const result = await executeMiddlewareChain(registry, 'test.action', { value: 'x' });
    expect(result).toBeNull();
  });

  test('resolves with null and warns when a middleware does not call next()', async () => {
    const warnSpy = vitest.spyOn(console, 'warn').mockImplementationOnce(() => undefined);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    registry.register('test.action', () => {});
    const result = await executeMiddlewareChain(registry, 'test.action', { value: 'x' });
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});
