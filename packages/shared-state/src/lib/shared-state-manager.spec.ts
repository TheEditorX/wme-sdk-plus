import { SharedStateManager } from './shared-state-manager.js';

describe('SharedStateManager', () => {
  let manager: SharedStateManager;

  beforeEach(() => {
    manager = new SharedStateManager({
      namespace: '__TEST_STATE__',
      staleLockTimeout: 1000, // 1 second for faster tests
    });
  });

  afterEach(() => {
    // Clean up
    manager.releaseAllLocks();
    manager.clearSharedData();
  });

  describe('Instance Management', () => {
    it('should generate unique instance IDs', () => {
      const manager1 = new SharedStateManager();
      const manager2 = new SharedStateManager();
      
      expect(manager1.getInstanceId()).not.toBe(manager2.getInstanceId());
    });

    it('should return namespace and version', () => {
      expect(manager.getNamespace()).toBe('__TEST_STATE__');
      expect(manager.getVersion()).toBe('1.0.0');
    });
  });

  describe('Lock Acquisition', () => {
    it('should successfully acquire an available lock', () => {
      const result = manager.acquireLock('testLock');
      
      expect(result.success).toBe(true);
      expect(result.wasStale).toBe(false);
    });

    it('should fail to acquire a held lock', () => {
      const manager1 = new SharedStateManager({ namespace: '__TEST_STATE__' });
      const manager2 = new SharedStateManager({ namespace: '__TEST_STATE__' });
      
      const result1 = manager1.acquireLock('testLock');
      const result2 = manager2.acquireLock('testLock');
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.currentOwnerId).toBe(manager1.getInstanceId());
    });

    it('should acquire lock with metadata', () => {
      const metadata = { purpose: 'test', timestamp: Date.now() };
      manager.acquireLock('testLock', metadata);
      
      const info = manager.getLockInfo('testLock');
      expect(info?.metadata).toEqual(metadata);
    });

    it('should take over a stale lock', async () => {
      const manager1 = new SharedStateManager({
        namespace: '__TEST_STATE__',
        staleLockTimeout: 100,
      });
      const manager2 = new SharedStateManager({
        namespace: '__TEST_STATE__',
        staleLockTimeout: 100,
      });
      
      // Manager1 acquires lock
      manager1.acquireLock('testLock');
      
      // Wait for lock to become stale
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Manager2 should be able to take it over
      const result = manager2.acquireLock('testLock');
      expect(result.success).toBe(true);
      expect(result.wasStale).toBe(true);
    });
  });

  describe('Lock Release', () => {
    it('should release owned lock', () => {
      manager.acquireLock('testLock');
      const released = manager.releaseLock('testLock');
      
      expect(released).toBe(true);
      expect(manager.hasLock('testLock')).toBe(false);
    });

    it('should not release lock owned by another instance', () => {
      const manager1 = new SharedStateManager({ namespace: '__TEST_STATE__' });
      const manager2 = new SharedStateManager({ namespace: '__TEST_STATE__' });
      
      manager1.acquireLock('testLock');
      const released = manager2.releaseLock('testLock');
      
      expect(released).toBe(false);
      expect(manager1.hasLock('testLock')).toBe(true);
    });

    it('should release all locks', () => {
      manager.acquireLock('lock1');
      manager.acquireLock('lock2');
      manager.acquireLock('lock3');
      
      const count = manager.releaseAllLocks();
      
      expect(count).toBe(3);
      expect(manager.hasLock('lock1')).toBe(false);
      expect(manager.hasLock('lock2')).toBe(false);
      expect(manager.hasLock('lock3')).toBe(false);
    });
  });

  describe('Lock Queries', () => {
    it('should correctly report lock ownership', () => {
      manager.acquireLock('testLock');
      
      expect(manager.hasLock('testLock')).toBe(true);
      expect(manager.hasLock('nonexistent')).toBe(false);
    });

    it('should correctly report if lock is held', () => {
      expect(manager.isLockHeld('testLock')).toBe(false);
      
      manager.acquireLock('testLock');
      expect(manager.isLockHeld('testLock')).toBe(true);
      
      manager.releaseLock('testLock');
      expect(manager.isLockHeld('testLock')).toBe(false);
    });

    it('should return lock info', () => {
      const metadata = { test: 'data' };
      manager.acquireLock('testLock', metadata);
      
      const info = manager.getLockInfo('testLock');
      
      expect(info).not.toBeNull();
      expect(info?.ownerId).toBe(manager.getInstanceId());
      expect(info?.metadata).toEqual(metadata);
      expect(info?.timestamp).toBeGreaterThan(0);
    });

    it('should return null for nonexistent lock info', () => {
      const info = manager.getLockInfo('nonexistent');
      expect(info).toBeNull();
    });

    it('should list all locks', () => {
      manager.acquireLock('lock1');
      manager.acquireLock('lock2');
      
      const locks = manager.listLocks();
      
      expect(locks).toContain('lock1');
      expect(locks).toContain('lock2');
      expect(locks.length).toBe(2);
    });
  });

  describe('Stale Lock Cleanup', () => {
    it('should clean up stale locks', async () => {
      const shortTimeout = new SharedStateManager({
        namespace: '__TEST_STATE__',
        staleLockTimeout: 50,
      });
      
      shortTimeout.acquireLock('lock1');
      shortTimeout.acquireLock('lock2');
      
      // Wait for locks to become stale
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const removed = manager.cleanupStaleLocks();
      
      expect(removed).toBe(2);
      expect(manager.listLocks()).toHaveLength(0);
    });

    it('should not clean up fresh locks', () => {
      manager.acquireLock('lock1');
      
      const removed = manager.cleanupStaleLocks();
      
      expect(removed).toBe(0);
      expect(manager.hasLock('lock1')).toBe(true);
    });
  });

  describe('Shared Data', () => {
    it('should set and get shared data', () => {
      manager.setSharedData('key1', 'value1');
      manager.setSharedData('key2', { nested: 'object' });
      
      expect(manager.getSharedData('key1')).toBe('value1');
      expect(manager.getSharedData('key2')).toEqual({ nested: 'object' });
    });

    it('should return default value for missing data', () => {
      const value = manager.getSharedData('nonexistent', 'default');
      expect(value).toBe('default');
    });

    it('should share data across instances', () => {
      const manager1 = new SharedStateManager({ namespace: '__TEST_STATE__' });
      const manager2 = new SharedStateManager({ namespace: '__TEST_STATE__' });
      
      manager1.setSharedData('sharedKey', 'sharedValue');
      
      expect(manager2.getSharedData('sharedKey')).toBe('sharedValue');
    });

    it('should delete shared data', () => {
      manager.setSharedData('key1', 'value1');
      
      const deleted = manager.deleteSharedData('key1');
      
      expect(deleted).toBe(true);
      expect(manager.getSharedData('key1')).toBeUndefined();
    });

    it('should return false when deleting nonexistent data', () => {
      const deleted = manager.deleteSharedData('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should clear all shared data', () => {
      manager.setSharedData('key1', 'value1');
      manager.setSharedData('key2', 'value2');
      
      manager.clearSharedData();
      
      expect(manager.getSharedData('key1')).toBeUndefined();
      expect(manager.getSharedData('key2')).toBeUndefined();
    });

    it('should preserve locks when clearing data', () => {
      manager.acquireLock('testLock');
      manager.setSharedData('key1', 'value1');
      
      manager.clearSharedData();
      
      expect(manager.hasLock('testLock')).toBe(true);
      expect(manager.getSharedData('key1')).toBeUndefined();
    });
  });

  describe('Multiple Namespaces', () => {
    it('should isolate state by namespace', () => {
      const manager1 = new SharedStateManager({ namespace: '__NAMESPACE_1__' });
      const manager2 = new SharedStateManager({ namespace: '__NAMESPACE_2__' });
      
      manager1.acquireLock('testLock');
      manager1.setSharedData('key', 'value1');
      
      // Manager2 in different namespace should not see manager1's lock or data
      expect(manager2.isLockHeld('testLock')).toBe(false);
      expect(manager2.getSharedData('key')).toBeUndefined();
      
      // Manager2 should be able to acquire the same lock name
      const result = manager2.acquireLock('testLock');
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid lock acquisitions', () => {
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(manager.acquireLock(`lock${i}`));
      }
      
      expect(results.every(r => r.success)).toBe(true);
      expect(manager.listLocks()).toHaveLength(100);
    });

    it('should handle complex data types', () => {
      const complexData = {
        array: [1, 2, 3],
        nested: { deep: { value: 'test' } },
        date: Date.now(),
        boolean: true,
        null: null,
      };
      
      manager.setSharedData('complex', complexData);
      const retrieved = manager.getSharedData('complex');
      
      expect(retrieved).toEqual(complexData);
    });
  });
});
