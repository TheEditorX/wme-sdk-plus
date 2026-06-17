import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionManager } from './transaction-manager';
import { ActionManager } from './types/action-manager';
import { Action } from './types/action';
import { MultiAction } from './types/multi-action';
import * as createMultiActionMock from './utils/create-multi-action';

vi.mock('./utils/create-multi-action', () => ({
  createMultiAction: vi.fn((actions) => {
    return {
      subActions: actions,
      doAction: vi.fn(),
      undoAction: vi.fn(),
      undoSupported: () => true,
    } as any;
  }),
}));

describe('TransactionManager', () => {
  let actionManager: ActionManager;
  let manager: TransactionManager;

  beforeEach(() => {
    actionManager = {
      dataModel: {},
      add: vi.fn(),
    };
    manager = new TransactionManager(actionManager);
    vi.clearAllMocks();
  });

  it('should support a single transaction', () => {
    manager.beginTransaction();
    const action1 = {
      doAction: vi.fn(),
      undoAction: vi.fn(),
      undoSupported: () => true,
    } as unknown as Action;

    // add an action to simulate WME adding an action
    // But since actionManager.add gets intercepted, we don't expect the mock to be called directly.
    // However, when commitTransaction runs, callOriginalInvocator will eventually call the *original* method,
    // which is the mock we provided.
    manager['_actionManagerAddInterceptor'].callOriginalInvocator = vi.fn();

    // Since we mock it manually, let's call the interceptor manually for test ease
    manager['activeTransaction']?.acceptAction(
      action1,
      actionManager.dataModel
    );

    manager.commitTransaction('My Description');

    expect(createMultiActionMock.createMultiAction).toHaveBeenCalledTimes(1);
    expect(
      manager['_actionManagerAddInterceptor'].callOriginalInvocator
    ).toHaveBeenCalledTimes(1);
  });

  it('should support nested transactions', () => {
    manager.beginTransaction(); // outer
    const action1 = {
      doAction: vi.fn(),
      undoAction: vi.fn(),
      undoSupported: () => true,
    } as unknown as Action;
    manager['activeTransaction']?.acceptAction(
      action1,
      actionManager.dataModel
    );

    manager.beginTransaction(); // inner
    const action2 = {
      doAction: vi.fn(),
      undoAction: vi.fn(),
      undoSupported: () => true,
    } as unknown as Action;
    manager['activeTransaction']?.acceptAction(
      action2,
      actionManager.dataModel
    );

    manager['_actionManagerAddInterceptor'].callOriginalInvocator = vi.fn();

    manager.commitTransaction('Inner Transaction'); // pops inner, adds to outer

    const action3 = {
      doAction: vi.fn(),
      undoAction: vi.fn(),
      undoSupported: () => true,
    } as unknown as Action;
    manager['activeTransaction']?.acceptAction(
      action3,
      actionManager.dataModel
    );

    // It should have outer transaction as active
    expect(manager['hasTransaction']).toBe(true);

    manager.commitTransaction('Outer Transaction');

    expect(createMultiActionMock.createMultiAction).toHaveBeenCalledTimes(2);
    // 1st time for inner, 2nd time for outer
    expect(
      manager['_actionManagerAddInterceptor'].callOriginalInvocator
    ).toHaveBeenCalledTimes(1); // Call original invocator is only called once at the end
  });
});
