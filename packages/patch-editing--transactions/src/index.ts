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
export function doActions<T>(cb: () => T, description?: string, manager?: TransactionManager): T {
  beginTransaction(manager);
  try {
    const result = cb();
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
    <T>(cb: () => T, description?: string) => doActions(cb, description)
  ),
];
