# Shared State Package

Cross-instance state management for WME SDK+.

## Overview

The `@wme-enhanced-sdk/shared-state` package provides a robust mechanism for coordinating state and locks across multiple SDK+ instances. This is essential when multiple userscripts load their own copies of SDK+, and they need to coordinate to prevent conflicts.

## Features

- **Multiple Named Locks**: Acquire and release locks with custom names for different purposes
- **Stale Lock Detection**: Automatically handles crashed/stale instances via configurable timeout
- **Shared Data Storage**: Store and retrieve arbitrary data accessible across all instances
- **Version Compatibility**: Ensures state structure compatibility across SDK versions
- **Instance Tracking**: Unique instance IDs for clear ownership management
- **Custom Namespaces**: Create isolated state managers for different features

## Installation

This package is internal to WME SDK+ and is automatically available when using the SDK.

## Basic Usage

### Simple Lock Management

```typescript
import { SharedStateManager } from '@wme-enhanced-sdk/shared-state';

const stateManager = new SharedStateManager();

// Try to acquire a lock
const result = stateManager.acquireLock('myFeature');

if (result.success) {
  console.log('Lock acquired! Performing exclusive operation...');
  
  // Do your work here
  performExclusiveOperation();
  
  // Release when done
  stateManager.releaseLock('myFeature');
} else {
  console.log(`Lock is held by instance: ${result.currentOwnerId}`);
}
```

### Multiple Locks

Different features can have independent locks:

```typescript
const stateManager = new SharedStateManager();

// Selection mode lock
if (stateManager.acquireLock('selectionMode').success) {
  // Enter selection mode
}

// Editing mode lock (independent from selection)
if (stateManager.acquireLock('editingMode').success) {
  // Enter editing mode
}

// Release independently
stateManager.releaseLock('selectionMode');
stateManager.releaseLock('editingMode');
```

### Shared Data Storage

Store data accessible to all instances:

```typescript
const stateManager = new SharedStateManager();

// One instance writes
stateManager.setSharedData('userPreferences', {
  theme: 'dark',
  language: 'en',
});

// Another instance reads
const prefs = stateManager.getSharedData('userPreferences', { theme: 'light' });
console.log(prefs.theme); // 'dark'
```

### Custom Namespace

Create isolated state for specific features:

```typescript
const myFeatureState = new SharedStateManager({
  namespace: '__MY_FEATURE_STATE__',
  staleLockTimeout: 30000, // 30 seconds
  version: '2.0.0',
});

// This won't conflict with other state managers
myFeatureState.acquireLock('processing');
```

## API Reference

### Constructor

```typescript
new SharedStateManager(options?: SharedStateManagerOptions)
```

**Options:**
- `namespace?: string` - Namespace for storage (default: `__WME_SDK_PLUS_SHARED_STATE__`)
- `version?: string` - Version for compatibility checking (default: `1.0.0`)
- `staleLockTimeout?: number` - Timeout in ms for stale detection (default: `60000`)

### Lock Management

#### `acquireLock(lockName: string, metadata?: Record<string, any>): LockAcquisitionResult`

Attempts to acquire a named lock.

**Returns:**
- `success`: Whether the lock was acquired
- `currentOwnerId`: ID of current owner (if not acquired)
- `wasStale`: Whether a stale lock was taken over

**Example:**
```typescript
const result = manager.acquireLock('editMode', { startedAt: Date.now() });
if (result.success) {
  if (result.wasStale) {
    console.log('Took over a stale lock');
  }
  // Perform operation
  manager.releaseLock('editMode');
}
```

#### `releaseLock(lockName: string): boolean`

Releases a lock owned by this instance.

**Returns:** `true` if released, `false` if not owned by this instance

#### `hasLock(lockName: string): boolean`

Checks if this instance owns a specific lock.

#### `isLockHeld(lockName: string): boolean`

Checks if any instance holds a lock (excluding stale locks).

#### `getLockInfo(lockName: string): LockState | null`

Gets detailed information about a lock.

**Returns:**
```typescript
{
  ownerId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}
```

#### `releaseAllLocks(): number`

Releases all locks owned by this instance. Returns the number of locks released.

#### `listLocks(includeStale?: boolean): string[]`

Lists all lock names. By default, excludes stale locks.

#### `cleanupStaleLocks(): number`

Removes all stale locks. Returns the number removed.

### Data Storage

#### `setSharedData<T>(key: string, value: T): void`

Stores data accessible by all instances.

#### `getSharedData<T>(key: string, defaultValue?: T): T | undefined`

Retrieves shared data.

#### `deleteSharedData(key: string): boolean`

Removes shared data. Returns `true` if the key existed.

#### `clearSharedData(): void`

Clears all shared data (preserves locks).

### Instance Information

#### `getInstanceId(): string`

Returns this instance's unique identifier.

#### `getNamespace(): string`

Returns the namespace being used.

#### `getVersion(): string`

Returns the version string.

## Advanced Patterns

### Cleanup on Unload

```typescript
const manager = new SharedStateManager();

window.addEventListener('beforeunload', () => {
  const released = manager.releaseAllLocks();
  console.log(`Released ${released} locks on unload`);
});
```

### Periodic Stale Lock Cleanup

```typescript
const manager = new SharedStateManager();

// Clean up every minute
setInterval(() => {
  const removed = manager.cleanupStaleLocks();
  if (removed > 0) {
    console.log(`Cleaned up ${removed} stale locks`);
  }
}, 60000);
```

### Lock with Retry

```typescript
async function acquireWithRetry(
  manager: SharedStateManager,
  lockName: string,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const result = manager.acquireLock(lockName);
    if (result.success) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return false;
}

// Usage
if (await acquireWithRetry(manager, 'criticalOperation')) {
  // Perform operation
  manager.releaseLock('criticalOperation');
}
```

### Feature-Specific State Managers

```typescript
// Create separate managers for different features
class SelectionModeCoordinator {
  private manager = new SharedStateManager({
    namespace: '__SELECTION_MODE__',
    staleLockTimeout: 60000,
  });

  enter(): boolean {
    return this.manager.acquireLock('active').success;
  }

  exit(): void {
    this.manager.releaseLock('active');
  }

  isActive(): boolean {
    return this.manager.isLockHeld('active');
  }
}
```

## Implementation Details

### Storage Mechanism

State is stored on the `window` object (or `unsafeWindow` in userscript contexts) using the configured namespace. This allows all scripts on the page to access the same state.

### Stale Lock Detection

Locks include a timestamp. When attempting to acquire a lock, if the existing lock's timestamp is older than `staleLockTimeout`, it's considered stale and can be taken over. This handles cases where an instance crashes or is terminated without proper cleanup.

### Instance IDs

Each instance generates a unique ID in the format: `instance_{timestamp}_{random}`. This ensures clear ownership tracking even when multiple instances are created rapidly.

### Thread Safety

JavaScript is single-threaded, so all operations are atomic at the operation level. However, be aware that between checking a lock and acquiring it, another instance could intervene. Always rely on the return value of `acquireLock()`.

## Best Practices

1. **Always Release Locks**: Use try-finally or cleanup handlers
2. **Short Lock Duration**: Keep locked operations as brief as possible
3. **Descriptive Lock Names**: Use clear names like `feature_operation` not just `lock`
4. **Cleanup on Unload**: Release locks when your script unloads
5. **Check Acquisition Success**: Always verify the return value of `acquireLock()`
6. **Use Metadata**: Add context to locks for debugging
7. **Periodic Cleanup**: Consider running `cleanupStaleLocks()` periodically

## Common Use Cases

### Exclusive Feature Activation

```typescript
const manager = new SharedStateManager();

function enterSelectionMode() {
  const result = manager.acquireLock('selectionMode');
  if (!result.success) {
    throw new Error('Another instance is already in selection mode');
  }
  // Proceed with selection mode
}

function exitSelectionMode() {
  manager.releaseLock('selectionMode');
}
```

### Shared Configuration

```typescript
const manager = new SharedStateManager();

// One script sets configuration
manager.setSharedData('mapSettings', {
  zoom: 15,
  center: { lat: 40.7128, lng: -74.0060 },
});

// Another script reads it
const settings = manager.getSharedData('mapSettings');
```

### Instance Coordination

```typescript
const manager = new SharedStateManager();

// Track all active instances
const instances = manager.getSharedData<string[]>('activeInstances', []);
instances.push(manager.getInstanceId());
manager.setSharedData('activeInstances', instances);

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  const instances = manager.getSharedData<string[]>('activeInstances', []);
  const filtered = instances.filter(id => id !== manager.getInstanceId());
  manager.setSharedData('activeInstances', filtered);
});
```

## Testing

The package includes comprehensive unit tests covering:
- Lock acquisition and release
- Stale lock detection and cleanup
- Shared data operations
- Multiple namespaces
- Edge cases and error conditions

Run tests with:
```bash
npx nx test @wme-enhanced-sdk/shared-state
```

## License

Apache License 2.0
