/* eslint-disable @typescript-eslint/no-explicit-any */
import { getWindow } from '@wme-enhanced-sdk/utils';

/**
 * Configuration options for SharedStateManager
 */
export interface SharedStateManagerOptions {
  /**
   * Namespace for the shared state storage
   * This allows multiple independent state managers to coexist
   * @default '__WME_SDK_PLUS_SHARED_STATE__'
   */
  namespace?: string;

  /**
   * Version string for state compatibility checking
   * @default '1.0.0'
   */
  version?: string;

  /**
   * Timeout in milliseconds for stale lock detection
   * Locks older than this will be considered stale and can be taken over
   * @default 60000 (60 seconds)
   */
  staleLockTimeout?: number;
}

/**
 * Internal structure for a lock in shared state
 */
interface LockState {
  ownerId: string | null;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Internal structure for shared state storage
 */
interface SharedStateStorage {
  version: string;
  locks: Record<string, LockState>;
  data: Record<string, any>;
}

/**
 * Result of a lock acquisition attempt
 */
export interface LockAcquisitionResult {
  /**
   * Whether the lock was successfully acquired
   */
  success: boolean;

  /**
   * ID of the current lock owner (if not acquired)
   */
  currentOwnerId?: string | null;

  /**
   * Whether the previous lock was stale and was taken over
   */
  wasStale?: boolean;
}

/**
 * Manages cross-instance shared state for WME SDK+
 * 
 * This manager provides a robust mechanism for coordinating state across multiple
 * SDK+ instances that may be loaded by different userscripts. It supports:
 * 
 * - **Multiple Named Locks**: Acquire and release locks with custom names for different purposes
 * - **Stale Lock Detection**: Automatically handles crashed/stale instances via timeout
 * - **Shared Data Storage**: Store and retrieve arbitrary data accessible across instances
 * - **Version Compatibility**: Ensures state structure compatibility across SDK versions
 * - **Instance Tracking**: Unique instance IDs for ownership management
 * 
 * @example Basic Lock Usage
 * ```typescript
 * const stateManager = new SharedStateManager();
 * 
 * // Try to acquire a lock
 * const result = stateManager.acquireLock('myFeature');
 * if (result.success) {
 *   // Do work
 *   stateManager.releaseLock('myFeature');
 * } else {
 *   console.log(`Lock held by ${result.currentOwnerId}`);
 * }
 * ```
 * 
 * @example Multiple Locks
 * ```typescript
 * const stateManager = new SharedStateManager();
 * 
 * // Different features can have different locks
 * stateManager.acquireLock('selectionMode');
 * stateManager.acquireLock('editingMode');
 * 
 * // Release independently
 * stateManager.releaseLock('selectionMode');
 * ```
 * 
 * @example Shared Data
 * ```typescript
 * const stateManager = new SharedStateManager();
 * 
 * // Set data accessible to all instances
 * stateManager.setSharedData('lastUpdate', Date.now());
 * 
 * // Read from another instance
 * const lastUpdate = stateManager.getSharedData('lastUpdate');
 * ```
 * 
 * @example Custom Namespace
 * ```typescript
 * // Create isolated state for a specific feature
 * const featureState = new SharedStateManager({
 *   namespace: '__MY_FEATURE_STATE__',
 *   staleLockTimeout: 30000, // 30 seconds
 * });
 * ```
 */
export class SharedStateManager {
  private readonly _namespace: string;
  private readonly _version: string;
  private readonly _staleLockTimeout: number;
  private readonly _instanceId: string;
  private readonly _window: Window & typeof globalThis & { [key: string]: any };

  /**
   * Creates a new SharedStateManager instance
   * 
   * @param options Configuration options
   */
  constructor(options: SharedStateManagerOptions = {}) {
    this._namespace = options.namespace || '__WME_SDK_PLUS_SHARED_STATE__';
    this._version = options.version || '1.0.0';
    this._staleLockTimeout = options.staleLockTimeout || 60000;
    this._window = getWindow();
    this._instanceId = this._generateInstanceId();
    this._ensureSharedState();
  }

  /**
   * Generates a unique instance ID
   * 
   * Format: `instance_{timestamp}_{random}`
   * @private
   */
  private _generateInstanceId(): string {
    return `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ensures the shared state structure exists in window storage
   * @private
   */
  private _ensureSharedState(): void {
    if (!this._window[this._namespace]) {
      this._window[this._namespace] = {
        version: this._version,
        locks: {},
        data: {},
      };
    }
  }

  /**
   * Gets the entire shared state storage
   * @private
   */
  private _getSharedState(): SharedStateStorage {
    this._ensureSharedState();
    return this._window[this._namespace];
  }

  /**
   * Checks if a lock is stale based on its timestamp
   * @private
   */
  private _isLockStale(lock: LockState): boolean {
    return Date.now() - lock.timestamp > this._staleLockTimeout;
  }

  /**
   * Attempts to acquire a named lock
   * 
   * A lock can only be acquired if:
   * - No other instance currently holds it, OR
   * - The current holder's lock is stale (older than staleLockTimeout)
   * 
   * @param lockName - Unique name for the lock
   * @param metadata - Optional metadata to store with the lock
   * @returns Result object indicating success and current state
   * 
   * @example
   * ```typescript
   * const result = manager.acquireLock('selectionMode', { 
   *   startedAt: Date.now() 
   * });
   * 
   * if (result.success) {
   *   console.log('Lock acquired!');
   * } else {
   *   console.log(`Lock held by ${result.currentOwnerId}`);
   * }
   * ```
   */
  acquireLock(lockName: string, metadata?: Record<string, any>): LockAcquisitionResult {
    const state = this._getSharedState();
    const lock = state.locks[lockName];

    // Check if lock exists and is not stale
    if (lock && lock.ownerId && !this._isLockStale(lock)) {
      // Lock is held by someone else
      return {
        success: false,
        currentOwnerId: lock.ownerId,
        wasStale: false,
      };
    }

    // Lock is available or stale, take it
    const wasStale = lock && this._isLockStale(lock);
    state.locks[lockName] = {
      ownerId: this._instanceId,
      timestamp: Date.now(),
      metadata,
    };

    return {
      success: true,
      wasStale: wasStale || false,
    };
  }

  /**
   * Releases a named lock
   * 
   * Only the instance that owns the lock can release it.
   * If this instance doesn't own the lock, the operation is silently ignored.
   * 
   * @param lockName - Name of the lock to release
   * @returns `true` if the lock was released, `false` if not owned by this instance
   * 
   * @example
   * ```typescript
   * manager.acquireLock('myLock');
   * // ... do work ...
   * manager.releaseLock('myLock');
   * ```
   */
  releaseLock(lockName: string): boolean {
    const state = this._getSharedState();
    const lock = state.locks[lockName];

    // Only release if we own it
    if (lock && lock.ownerId === this._instanceId) {
      delete state.locks[lockName];
      return true;
    }

    return false;
  }

  /**
   * Checks if this instance owns a specific lock
   * 
   * @param lockName - Name of the lock to check
   * @returns `true` if this instance owns the lock
   * 
   * @example
   * ```typescript
   * if (manager.hasLock('myLock')) {
   *   // Safe to perform locked operation
   * }
   * ```
   */
  hasLock(lockName: string): boolean {
    const state = this._getSharedState();
    const lock = state.locks[lockName];
    return lock?.ownerId === this._instanceId;
  }

  /**
   * Checks if any instance currently holds a specific lock
   * 
   * Stale locks are considered as not held.
   * 
   * @param lockName - Name of the lock to check
   * @returns `true` if any instance holds the lock (and it's not stale)
   * 
   * @example
   * ```typescript
   * if (!manager.isLockHeld('myLock')) {
   *   // Lock is available
   * }
   * ```
   */
  isLockHeld(lockName: string): boolean {
    const state = this._getSharedState();
    const lock = state.locks[lockName];
    return lock != null && lock.ownerId != null && !this._isLockStale(lock);
  }

  /**
   * Gets information about who holds a specific lock
   * 
   * @param lockName - Name of the lock to query
   * @returns Lock state information, or `null` if lock doesn't exist or is stale
   * 
   * @example
   * ```typescript
   * const info = manager.getLockInfo('myLock');
   * if (info) {
   *   console.log(`Held by ${info.ownerId} since ${new Date(info.timestamp)}`);
   *   console.log('Metadata:', info.metadata);
   * }
   * ```
   */
  getLockInfo(lockName: string): LockState | null {
    const state = this._getSharedState();
    const lock = state.locks[lockName];

    if (!lock || this._isLockStale(lock)) {
      return null;
    }

    return { ...lock };
  }

  /**
   * Releases all locks owned by this instance
   * 
   * Useful for cleanup when a feature is disabled or the script is unloading.
   * 
   * @returns Number of locks released
   * 
   * @example
   * ```typescript
   * // Clean up on unload
   * window.addEventListener('beforeunload', () => {
   *   manager.releaseAllLocks();
   * });
   * ```
   */
  releaseAllLocks(): number {
    const state = this._getSharedState();
    let released = 0;

    for (const lockName in state.locks) {
      if (state.locks[lockName].ownerId === this._instanceId) {
        delete state.locks[lockName];
        released++;
      }
    }

    return released;
  }

  /**
   * Stores data in shared state accessible by all instances
   * 
   * @param key - Key to store data under
   * @param value - Value to store (must be JSON-serializable)
   * 
   * @example
   * ```typescript
   * manager.setSharedData('config', { theme: 'dark', lang: 'en' });
   * manager.setSharedData('lastSync', Date.now());
   * ```
   */
  setSharedData<T = any>(key: string, value: T): void {
    const state = this._getSharedState();
    state.data[key] = value;
  }

  /**
   * Retrieves data from shared state
   * 
   * @param key - Key to retrieve
   * @param defaultValue - Value to return if key doesn't exist
   * @returns The stored value, or defaultValue if not found
   * 
   * @example
   * ```typescript
   * const config = manager.getSharedData('config', { theme: 'light' });
   * const count = manager.getSharedData('count', 0);
   * ```
   */
  getSharedData<T = any>(key: string, defaultValue?: T): T | undefined {
    const state = this._getSharedState();
    return state.data[key] !== undefined ? state.data[key] : defaultValue;
  }

  /**
   * Removes data from shared state
   * 
   * @param key - Key to remove
   * @returns `true` if the key existed and was removed
   * 
   * @example
   * ```typescript
   * manager.deleteSharedData('tempData');
   * ```
   */
  deleteSharedData(key: string): boolean {
    const state = this._getSharedState();
    if (key in state.data) {
      delete state.data[key];
      return true;
    }
    return false;
  }

  /**
   * Clears all shared data (but preserves locks)
   * 
   * @example
   * ```typescript
   * manager.clearSharedData();
   * ```
   */
  clearSharedData(): void {
    const state = this._getSharedState();
    state.data = {};
  }

  /**
   * Gets the unique ID of this instance
   * 
   * @returns This instance's unique identifier
   * 
   * @example
   * ```typescript
   * console.log(`Instance ID: ${manager.getInstanceId()}`);
   * ```
   */
  getInstanceId(): string {
    return this._instanceId;
  }

  /**
   * Gets the namespace this manager is using
   * 
   * @returns The namespace string
   */
  getNamespace(): string {
    return this._namespace;
  }

  /**
   * Gets the version string for this state manager
   * 
   * @returns The version string
   */
  getVersion(): string {
    return this._version;
  }

  /**
   * Lists all currently held locks (including stale ones)
   * 
   * @param includeStale - Whether to include stale locks in the result
   * @returns Array of lock names
   * 
   * @example
   * ```typescript
   * const activeLocks = manager.listLocks(false);
   * console.log('Active locks:', activeLocks);
   * ```
   */
  listLocks(includeStale: boolean = false): string[] {
    const state = this._getSharedState();
    const locks: string[] = [];

    for (const lockName in state.locks) {
      const lock = state.locks[lockName];
      if (includeStale || !this._isLockStale(lock)) {
        locks.push(lockName);
      }
    }

    return locks;
  }

  /**
   * Cleans up all stale locks
   * 
   * This can be called periodically to remove locks from crashed/terminated instances.
   * 
   * @returns Number of stale locks removed
   * 
   * @example
   * ```typescript
   * // Periodic cleanup
   * setInterval(() => {
   *   const removed = manager.cleanupStaleLocks();
   *   if (removed > 0) {
   *     console.log(`Cleaned up ${removed} stale locks`);
   *   }
   * }, 60000);
   * ```
   */
  cleanupStaleLocks(): number {
    const state = this._getSharedState();
    let removed = 0;

    for (const lockName in state.locks) {
      if (this._isLockStale(state.locks[lockName])) {
        delete state.locks[lockName];
        removed++;
      }
    }

    return removed;
  }
}
