/* eslint-disable @typescript-eslint/no-explicit-any */
import { PropertySwapper } from '@wme-enhanced-sdk/method-interceptor';
import { MiddlewareRegistry } from '@wme-enhanced-sdk/patch-middleware';
import * as jsondiffpatch from 'jsondiffpatch';
import { executeMiddlewareChain } from './execute-middleware-chain.js';

/** Data shape for the `added` action point. */
export interface AddedContext<T extends object> {
  /** The DTO of the object being added. Can be modified to alter the object. */
  object: T;
}

/** Data shape for the `changed` action point. */
export interface ChangedContext<T extends object> {
  /** Immutable snapshot of the object before the change. */
  readonly oldObject: T;
  /** The new (mutated) DTO. Can be modified to alter the final state. */
  newObject: T;
  /**
   * A {@link https://github.com/benjamine/jsondiffpatch jsondiffpatch} delta
   * describing the difference between {@link oldObject} and {@link newObject}.
   */
  readonly diff: jsondiffpatch.Delta | undefined;
}

/** Data shape for the `removed` action point. */
export interface RemovedContext<T extends object> {
  /** The DTO of the object being removed. */
  readonly object: T;
}

/**
 * Normalises a Backbone `models` argument into a flat array of objects.
 * The argument may be a single model, a plain attributes object, or an array.
 */
function toModelsArray(models: any): any[] {
  if (models == null) return [];
  return Array.isArray(models) ? models : [models];
}

/**
 * Extracts a shallow copy of raw attributes from a Backbone Model instance
 * or a plain attributes object.
 */
function getAttributes(model: any): Record<string, unknown> {
  return model != null && typeof model === 'object' && model.attributes != null
    ? { ...model.attributes }
    : { ...model };
}

/**
 * Intercepts all add/remove/update operations on a single Backbone Collection
 * (WME data-model repository) and routes them through the middleware chain
 * registered via {@link MiddlewareRegistry}.
 *
 * The interceptor patches the collection's `set` method – the single internal
 * entry-point that Backbone calls for every add/remove/merge, regardless of
 * whether the caller used `.add()`, `.remove()`, or `.set()` directly.
 *
 * A separate `change` event listener handles attribute updates that originate
 * outside the collection (e.g. direct `model.set()` calls from WME action
 * undo/redo).  A boolean flag prevents the two paths from double-firing.
 */
export class RepositoryInterceptor<T extends object> {
  private readonly setSwapper: PropertySwapper;
  private readonly changeListenerRef: (model: any) => void;
  private enabled = false;

  /**
   * True while the intercepted `set` wrapper is executing, so the `change`
   * event handler skips models that are already being processed by `set`.
   */
  private insideInterceptedSet = false;

  constructor(
    private readonly repository: any,
    private readonly registry: MiddlewareRegistry,
    private readonly addedActionPoint: string,
    private readonly changedActionPoint: string,
    private readonly removedActionPoint: string,
  ) {
    this.changeListenerRef = this.handleModelChange.bind(this);
    this.setSwapper = new PropertySwapper(repository, 'set');
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    // Intercept the core `set` method for add / remove / merge operations.
    const self = this;
    this.setSwapper.swap(function (
      this: any,
      models: any,
      options: any,
    ): any {
      const originalSet = self.setSwapper.originalValue;
      return self.handleSet(originalSet.bind(this), models, options ?? {});
    } as any);

    // Listen for model attribute changes that bubble up to the collection
    // (covers direct `model.set()` calls outside of the collection's own `set`).
    this.repository.on('change', this.changeListenerRef);
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    this.setSwapper.restore();
    this.repository.off('change', this.changeListenerRef);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Async handler injected as the replacement for `collection.set`.
   *
   * Backbone calls `set` for all mutations – add, merge, and remove – so we
   * classify each incoming model against the current collection state and run
   * the corresponding middleware chain before forwarding to the original `set`.
   *
   * Middlewares receive the data object matching the action's context interface
   * and may modify `context.data` or throw {@link MiddlewarePreventedError} to
   * cancel the operation for that individual object.
   */
  private async handleSet(
    originalSet: (models: any, options: any) => any,
    models: any,
    options: any,
  ): Promise<any> {
    const modelsArray = toModelsArray(models);

    const addEnabled = options.add !== false;
    const mergeEnabled = options.merge !== false;
    const removeEnabled = options.remove === true;

    // ── Process each incoming model ──────────────────────────────────────
    const processedModels: any[] = [];

    for (const model of modelsArray) {
      const attrs = getAttributes(model);
      const modelIdAttr: string = this.repository.modelId ?? 'id';
      const id = attrs[modelIdAttr];
      const existing = id != null ? this.repository.get(id) : null;

      if (existing != null && mergeEnabled) {
        // ── Changed ──────────────────────────────────────────────────────
        if (!this.registry.hasListeners(this.changedActionPoint)) {
          processedModels.push(model);
          continue;
        }

        const oldAttrs = getAttributes(existing);
        const diff = jsondiffpatch.diff(oldAttrs, attrs);

        // Only fire middleware when attributes actually changed.
        if (diff == null) {
          processedModels.push(model);
          continue;
        }

        const ctx: ChangedContext<T> = {
          oldObject: oldAttrs as unknown as T,
          newObject: { ...attrs } as unknown as T,
          diff,
        };

        const result = await executeMiddlewareChain(
          this.registry,
          this.changedActionPoint,
          ctx,
        );

        if (result === null) {
          // Prevented – skip the update for this model.
          continue;
        }

        // Pass a plain attributes object; Backbone will find and merge it
        // into the existing model instance by ID.
        processedModels.push({ ...(result.newObject as Record<string, unknown>) });

      } else if (existing == null && addEnabled) {
        // ── Added ─────────────────────────────────────────────────────────
        if (!this.registry.hasListeners(this.addedActionPoint)) {
          processedModels.push(model);
          continue;
        }

        const ctx: AddedContext<T> = { object: { ...attrs } as unknown as T };
        const result = await executeMiddlewareChain(
          this.registry,
          this.addedActionPoint,
          ctx,
        );

        if (result === null) {
          // Prevented – do not add this model.
          continue;
        }

        processedModels.push({ ...(result.object as Record<string, unknown>) });

      } else {
        // No relevant action for this model in this call; forward as-is.
        processedModels.push(model);
      }
    }

    // ── Handle removals ───────────────────────────────────────────────────
    // When `remove` is true, Backbone drops models that are present in the
    // collection but absent from the new `models` array.  We compute that set,
    // run the `removed` middleware, and re-inject any whose removal was
    // prevented so Backbone keeps them.
    const cancelledRemovals: any[] = [];

    if (removeEnabled && this.registry.hasListeners(this.removedActionPoint)) {
      const incomingIds = new Set(
        modelsArray
          .map((m) => getAttributes(m)[this.repository.modelId ?? 'id'])
          .filter((id) => id != null),
      );

      const toRemove: any[] = (this.repository.models as any[]).filter((m) => {
        const id = m?.id ?? m?.attributes?.id;
        return id != null && !incomingIds.has(id);
      });

      for (const existingModel of toRemove) {
        const attrs = getAttributes(existingModel);
        const ctx: RemovedContext<T> = { object: attrs as unknown as T };

        const result = await executeMiddlewareChain(
          this.registry,
          this.removedActionPoint,
          ctx,
        );

        if (result === null) {
          // Prevented – keep this model by re-injecting it.
          cancelledRemovals.push(existingModel);
        }
      }
    }

    // Build the final models array.  Re-injected models ensure Backbone retains
    // them even though they were absent from the original `models` argument.
    const finalModels = [...processedModels, ...cancelledRemovals];

    if (finalModels.length === 0 && !removeEnabled) {
      return;
    }

    // Set the guard so handleModelChange skips change events triggered
    // synchronously by the original `set` call below.
    this.insideInterceptedSet = true;
    try {
      return originalSet(
        finalModels.length === 1 && !removeEnabled ? finalModels[0] : finalModels,
        options,
      );
    } finally {
      this.insideInterceptedSet = false;
    }
  }

  /**
   * Handles the Backbone `change` event that fires when a model's attributes
   * are updated **outside** the collection's own `set` call (e.g. direct
   * `model.set()` from a WME undo/redo action).
   *
   * When the change originates from our intercepted `set`, the
   * {@link insideInterceptedSet} guard prevents double-firing.
   *
   * Middlewares may modify `context.data.newObject` to alter the final state,
   * or throw {@link MiddlewarePreventedError} to revert the change.
   */
  private async handleModelChange(model: any): Promise<void> {
    // Skip changes that already went through handleSet.
    if (this.insideInterceptedSet) return;
    if (!this.registry.hasListeners(this.changedActionPoint)) return;

    // `previousAttributes()` returns the attributes before the most recent
    // synchronous `model.set()` call.
    const oldAttrs: Record<string, unknown> = model.previousAttributes
      ? { ...model.previousAttributes() }
      : {};
    const newAttrs: Record<string, unknown> = { ...model.attributes };

    const diff = jsondiffpatch.diff(oldAttrs, newAttrs);
    if (diff == null) return;

    const ctx: ChangedContext<T> = {
      oldObject: oldAttrs as unknown as T,
      newObject: { ...newAttrs } as unknown as T,
      diff,
    };

    const result = await executeMiddlewareChain(
      this.registry,
      this.changedActionPoint,
      ctx,
    );

    if (result === null) {
      // Prevented – revert the model silently (no further change events).
      model.set(oldAttrs, { silent: true });
      return;
    }

    const finalAttrs = result.newObject as Record<string, unknown>;
    // Apply modifications only when the middleware actually changed something.
    if (jsondiffpatch.diff(newAttrs, finalAttrs) != null) {
      model.set(finalAttrs, { silent: true });
    }
  }
}
