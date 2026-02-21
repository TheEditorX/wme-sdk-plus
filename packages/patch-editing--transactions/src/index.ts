import { DefinePropertyRule } from '@wme-enhanced-sdk/sdk-patcher';
import { getWindow } from '@wme-enhanced-sdk/utils';
import { TransactionManager } from './transaction-manager.js';

let transactionManager: TransactionManager;

function getTransactionManager() {
  if (!transactionManager) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const window = getWindow<{ W: any }>();
    transactionManager = new TransactionManager(window.W.model.actionManager);
  }

  return transactionManager;
}

export function beginTransaction(manager: TransactionManager = getTransactionManager()): void {
  manager.beginTransaction();
}
export function commitTransaction(description?: string, manager: TransactionManager = getTransactionManager()): void {
  manager.commitTransaction(description);
}
export function cancelTransaction(manager: TransactionManager = getTransactionManager()): void {
  manager.cancelTransaction();
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function doActions<T>(cb: () => T extends Promise<any> ? never : T, description?: string, manager?: TransactionManager): T {
  beginTransaction(manager);
  try {
    const result = cb();
    if (result instanceof Promise) {
      console.error(
        'doActions detected an async callback. Async operations are not supported because ' +
        'actions added after the transaction closes cannot be captured. Complete async work ' +
        'before calling doActions, or use synchronous callbacks only.\n\n' +

        'The provided callback will continue to execute in this session and may have side-effects ' +
        'on the WME session, and may have the actions generated within that callback to leak outside ' +
        'the boundaries of the transaction into the change log.'
      );
      cancelTransaction(manager);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return undefined!;
    }

    commitTransaction(description, manager);
    return result;
  } catch (e) {
    cancelTransaction(manager);
    throw e;
  }
}

export default [
  new DefinePropertyRule(
    'Editing.beginTransaction',
    () => beginTransaction(),
  ),
  new DefinePropertyRule(
    'Editing.commitTransaction',
    (description?: string) => commitTransaction(description),
  ),
  new DefinePropertyRule(
    'Editing.cancelTransaction',
    () => cancelTransaction(),
  ),
  new DefinePropertyRule(
    'Editing.doActions',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <T>(cb: () => T extends Promise<any> ? never : T, description?: string) => doActions(cb, description)
  ),
];
