/* eslint-disable @typescript-eslint/no-explicit-any */
import { getWindow } from '@wme-enhanced-sdk/utils';

const SHARED_STATE_KEY = '__WME_SDK_PLUS_SELECTION_MODE__';
const VERSION = '1.0.0';

interface SharedSelectionState {
  version: string;
  isActive: boolean;
  activeInstanceId: string | null;
  timestamp: number;
}

/**
 * Manages shared state across multiple SDK+ instances for selection mode coordination
 * 
 * This allows multiple scripts using different SDK+ instances to coordinate
 * and ensure only one selection mode is active at a time.
 */
export class SharedSelectionStateManager {
  private _instanceId: string;
  private _window: Window & typeof globalThis & { [key: string]: any };

  constructor() {
    this._window = getWindow();
    this._instanceId = this._generateInstanceId();
    this._ensureSharedState();
  }

  /**
   * Generates a unique instance ID
   */
  private _generateInstanceId(): string {
    return `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ensures the shared state object exists
   */
  private _ensureSharedState(): void {
    if (!this._window[SHARED_STATE_KEY]) {
      this._window[SHARED_STATE_KEY] = {
        version: VERSION,
        isActive: false,
        activeInstanceId: null,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Gets the current shared state
   */
  private _getSharedState(): SharedSelectionState {
    this._ensureSharedState();
    return this._window[SHARED_STATE_KEY];
  }

  /**
   * Sets the shared state
   */
  private _setSharedState(state: Partial<SharedSelectionState>): void {
    this._ensureSharedState();
    Object.assign(this._window[SHARED_STATE_KEY], {
      ...state,
      timestamp: Date.now(),
    });
  }

  /**
   * Attempts to acquire the selection mode lock
   * Returns true if successful, false if another instance has the lock
   */
  acquireLock(): boolean {
    const state = this._getSharedState();
    
    // If no one has the lock, or the lock is stale (older than 60 seconds), take it
    const isStale = Date.now() - state.timestamp > 60000;
    
    if (!state.isActive || isStale) {
      this._setSharedState({
        isActive: true,
        activeInstanceId: this._instanceId,
      });
      return true;
    }
    
    // Someone else has the lock
    return false;
  }

  /**
   * Releases the selection mode lock
   */
  releaseLock(): void {
    const state = this._getSharedState();
    
    // Only release if we own the lock
    if (state.activeInstanceId === this._instanceId) {
      this._setSharedState({
        isActive: false,
        activeInstanceId: null,
      });
    }
  }

  /**
   * Checks if this instance owns the lock
   */
  hasLock(): boolean {
    const state = this._getSharedState();
    return state.activeInstanceId === this._instanceId;
  }

  /**
   * Checks if any instance is currently in selection mode
   */
  isAnyInstanceActive(): boolean {
    const state = this._getSharedState();
    const isStale = Date.now() - state.timestamp > 60000;
    return state.isActive && !isStale;
  }

  /**
   * Gets the ID of the current instance
   */
  getInstanceId(): string {
    return this._instanceId;
  }
}
