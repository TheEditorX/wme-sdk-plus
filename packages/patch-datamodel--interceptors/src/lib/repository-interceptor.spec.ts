/* eslint-disable @typescript-eslint/no-explicit-any */
import { MiddlewareRegistry, MiddlewarePreventedError } from '@wme-enhanced-sdk/patch-middleware';
import { RepositoryInterceptor } from './repository-interceptor.js';

// ── Minimal Backbone Collection mock ────────────────────────────────────────

interface MockModel {
  id: number;
  attributes: Record<string, unknown>;
  previousAttributes(): Record<string, unknown>;
  set(attrs: Record<string, unknown>, options?: any): void;
}

function createMockModel(id: number, attrs: Record<string, unknown> = {}): MockModel {
  const current: Record<string, unknown> = { id, ...attrs };
  let previous: Record<string, unknown> = { ...current };
  return {
    id,
    attributes: current,
    previousAttributes: () => ({ ...previous }),
    set(newAttrs: Record<string, unknown>) {
      previous = { ...current };
      Object.assign(current, newAttrs);
    },
  };
}

function createMockCollection(initialModels: MockModel[] = []) {
  const eventListeners: Record<string, Array<(model: any) => void>> = {};
  const models: MockModel[] = [...initialModels];

  const collection = {
    models,
    modelId: 'id',
    get: (id: unknown) => models.find((m) => m.id === id) ?? null,
    set: vitest.fn((incoming: any, _options: any) => {
      // Simulate Backbone merging: update existing, add new
      const incomingArr = Array.isArray(incoming) ? incoming : [incoming];
      for (const item of incomingArr) {
        const attrs = item?.attributes ?? item;
        const existing = models.find((m) => m.id === attrs.id);
        if (existing) {
          Object.assign(existing.attributes, attrs);
        } else {
          models.push(createMockModel(attrs.id as number, attrs));
        }
      }
    }),
    on: (event: string, handler: (model: any) => void) => {
      (eventListeners[event] ??= []).push(handler);
    },
    off: (event: string, handler: (model: any) => void) => {
      const arr = eventListeners[event];
      if (arr) {
        const idx = arr.indexOf(handler);
        if (idx !== -1) arr.splice(idx, 1);
      }
    },
    _triggerChange: (model: MockModel) => {
      for (const h of eventListeners['change'] ?? []) h(model);
    },
  };

  return collection;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildInterceptor(
  collection: ReturnType<typeof createMockCollection>,
  registry: MiddlewareRegistry,
) {
  return new RepositoryInterceptor(
    collection,
    registry,
    'DataModel.Test.added',
    'DataModel.Test.changed',
    'DataModel.Test.removed',
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RepositoryInterceptor', () => {
  let registry: MiddlewareRegistry;
  let collection: ReturnType<typeof createMockCollection>;

  beforeEach(() => {
    registry = new MiddlewareRegistry(null as any);
    collection = createMockCollection();
  });

  // ── enable / disable ────────────────────────────────────────────────────

  test('enable() replaces collection.set with intercepted version', () => {
    const interceptor = buildInterceptor(collection, registry);
    const originalSet = collection.set;
    interceptor.enable();
    expect(collection.set).not.toBe(originalSet);
    interceptor.disable();
    expect(collection.set).toBe(originalSet);
  });

  test('disable() is idempotent', () => {
    const interceptor = buildInterceptor(collection, registry);
    interceptor.enable();
    interceptor.disable();
    interceptor.disable(); // second call must not throw
  });

  // ── added ────────────────────────────────────────────────────────────────

  test('fires DataModel.Test.added when a new model is set', async () => {
    const interceptor = buildInterceptor(collection, registry);
    interceptor.enable();

    const addedObjects: any[] = [];
    registry.register('DataModel.Test.added', (ctx, next) => {
      addedObjects.push({ ...ctx.data });
      next();
    });

    await (collection.set as any)({ id: 1, name: 'Alpha' }, {});
    await vitest.waitFor(() => addedObjects.length > 0);

    expect(addedObjects).toHaveLength(1);
    expect(addedObjects[0].object).toMatchObject({ id: 1, name: 'Alpha' });
  });

  test('middleware can modify the added object', async () => {
    const interceptor = buildInterceptor(collection, registry);
    const originalSet = collection.set;
    interceptor.enable();

    registry.register('DataModel.Test.added', (ctx, next) => {
      (ctx.data as any).object.name = 'MODIFIED';
      next();
    });

    await (collection.set as any)({ id: 1, name: 'Alpha' }, {});

    // The modified attrs should have been forwarded to the original set
    const passedArg = (originalSet as any).mock.calls[0][0];
    const attrs = Array.isArray(passedArg) ? passedArg[0] : passedArg;
    expect(attrs.name).toBe('MODIFIED');
  });

  test('middleware can cancel an add by throwing MiddlewarePreventedError', async () => {
    const interceptor = buildInterceptor(collection, registry);
    const originalSet = collection.set;
    interceptor.enable();

    registry.register('DataModel.Test.added', () => {
      throw new MiddlewarePreventedError();
    });

    const originalSetCallCount = (originalSet as any).mock.calls.length;
    await (collection.set as any)({ id: 1 }, {});

    // Model must not be forwarded to the real collection.set
    const callsAfter = (originalSet as any).mock.calls.length;
    expect(callsAfter).toBe(originalSetCallCount);
  });

  test('middleware can cancel an add by returning null', async () => {
    const interceptor = buildInterceptor(collection, registry);
    const originalSet = collection.set;
    interceptor.enable();

    registry.register('DataModel.Test.added', () => null);

    const originalSetCallCount = (originalSet as any).mock.calls.length;
    await (collection.set as any)({ id: 1 }, {});

    const callsAfter = (originalSet as any).mock.calls.length;
    expect(callsAfter).toBe(originalSetCallCount);
  });

  // ── changed ──────────────────────────────────────────────────────────────

  test('fires DataModel.Test.changed when an existing model is updated', async () => {
    collection = createMockCollection([createMockModel(1, { name: 'OldName' })]);
    const interceptor = buildInterceptor(collection, registry);
    interceptor.enable();

    const changedCtxList: any[] = [];
    registry.register('DataModel.Test.changed', (ctx, next) => {
      changedCtxList.push({ ...ctx.data });
      next();
    });

    await (collection.set as any)({ id: 1, name: 'NewName' }, {});
    await vitest.waitFor(() => changedCtxList.length > 0);

    expect(changedCtxList).toHaveLength(1);
    expect(changedCtxList[0].oldObject).toMatchObject({ id: 1, name: 'OldName' });
    expect(changedCtxList[0].newObject).toMatchObject({ id: 1, name: 'NewName' });
  });

  test('provides a diff in the changed context', async () => {
    collection = createMockCollection([createMockModel(1, { name: 'OldName' })]);
    const interceptor = buildInterceptor(collection, registry);
    interceptor.enable();

    let capturedDiff: any = undefined;
    registry.register('DataModel.Test.changed', (ctx, next) => {
      capturedDiff = (ctx.data as any).diff;
      next();
    });

    await (collection.set as any)({ id: 1, name: 'NewName' }, {});
    await vitest.waitFor(() => capturedDiff !== undefined);

    expect(capturedDiff).toBeDefined();
  });

  test('does not fire changed when attributes are unchanged', async () => {
    collection = createMockCollection([createMockModel(1, { name: 'Same' })]);
    const interceptor = buildInterceptor(collection, registry);
    interceptor.enable();

    const changedFired: boolean[] = [];
    registry.register('DataModel.Test.changed', (ctx, next) => {
      changedFired.push(true);
      next();
    });

    // Same data — no diff
    await (collection.set as any)({ id: 1, name: 'Same' }, {});

    // Allow microtasks to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(changedFired).toHaveLength(0);
  });

  test('middleware can cancel a change (model not updated)', async () => {
    collection = createMockCollection([createMockModel(1, { name: 'OldName' })]);
    const interceptor = buildInterceptor(collection, registry);
    const originalSet = collection.set;
    interceptor.enable();

    registry.register('DataModel.Test.changed', () => {
      throw new MiddlewarePreventedError();
    });

    const originalSetCallCount = (originalSet as any).mock.calls.length;
    await (collection.set as any)({ id: 1, name: 'NewName' }, {});

    // Changed model must not be forwarded
    const callsAfter = (originalSet as any).mock.calls.length;
    expect(callsAfter).toBe(originalSetCallCount);
  });

  // ── removed ──────────────────────────────────────────────────────────────

  test('fires DataModel.Test.removed when a model is absent from a remove:true set call', async () => {
    collection = createMockCollection([
      createMockModel(1, { name: 'One' }),
      createMockModel(2, { name: 'Two' }),
    ]);
    const interceptor = buildInterceptor(collection, registry);
    interceptor.enable();

    const removedObjects: any[] = [];
    registry.register('DataModel.Test.removed', (ctx, next) => {
      removedObjects.push({ ...ctx.data });
      next();
    });

    // Set only model 1 with remove:true — model 2 should be removed
    await (collection.set as any)([{ id: 1, name: 'One' }], { remove: true });
    await vitest.waitFor(() => removedObjects.length > 0);

    expect(removedObjects).toHaveLength(1);
    expect(removedObjects[0].object).toMatchObject({ id: 2, name: 'Two' });
  });

  test('middleware can cancel a removal by throwing MiddlewarePreventedError', async () => {
    collection = createMockCollection([
      createMockModel(1, { name: 'One' }),
      createMockModel(2, { name: 'Two' }),
    ]);
    const interceptor = buildInterceptor(collection, registry);
    const originalSet = collection.set;
    interceptor.enable();

    registry.register('DataModel.Test.removed', () => {
      throw new MiddlewarePreventedError();
    });

    await (collection.set as any)([{ id: 1 }], { remove: true });

    // The original set should have been called with model 2 re-injected
    const lastCall = (originalSet as any).mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const passedModels: any[] = Array.isArray(lastCall[0]) ? lastCall[0] : [lastCall[0]];
    const ids = passedModels.map((m: any) => m?.attributes?.id ?? m?.id);
    expect(ids).toContain(2);
  });

  // ── handleModelChange fallback ───────────────────────────────────────────

  test('fires DataModel.Test.changed on direct model.set via change event', async () => {
    const model = createMockModel(1, { name: 'Before' });
    collection = createMockCollection([model]);
    const interceptor = buildInterceptor(collection, registry);
    interceptor.enable();

    const changedCtxList: any[] = [];
    registry.register('DataModel.Test.changed', (ctx, next) => {
      changedCtxList.push({ ...ctx.data });
      next();
    });

    // Simulate a direct model.set() triggering a Backbone change event
    model.attributes['name'] = 'After';
    collection._triggerChange(model);
    await vitest.waitFor(() => changedCtxList.length > 0);

    expect(changedCtxList[0].newObject).toMatchObject({ id: 1, name: 'After' });
  });
});
