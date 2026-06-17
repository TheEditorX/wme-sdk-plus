import { Stack } from '@wme-enhanced-sdk/utils';
import { LoggerableMethodInterceptor } from '@wme-enhanced-sdk/method-interceptor';
import { Transaction } from './transaction.js';
import { ActionManager } from './types/action-manager.js';
import { createMultiAction } from './utils/create-multi-action.js';

export class TransactionManager {
  private _transactionStack = new Stack<Transaction>();
  private _actionManagerAddInterceptor: LoggerableMethodInterceptor<
    ActionManager,
    'add'
  >;

  constructor(actionManager: ActionManager) {
    this._actionManagerAddInterceptor = new LoggerableMethodInterceptor(
      actionManager,
      'add',
      (_invoke, action) => {
        this.activeTransaction?.acceptAction?.(action, actionManager.dataModel);
        return true;
      }
    );
  }

  private get activeTransaction() {
    return this._transactionStack.peek();
  }

  private openTransaction() {
    if (this._transactionStack.isEmpty) {
      this._actionManagerAddInterceptor.enable();
    }
    this._transactionStack.push(new Transaction());
  }

  private closeTransaction() {
    const transaction = this._transactionStack.pop();
    if (this._transactionStack.isEmpty) {
      this._actionManagerAddInterceptor.flushLoggedRequests();
      this._actionManagerAddInterceptor.disable();
    }
    return transaction;
  }

  private get hasTransaction() {
    return !this._transactionStack.isEmpty;
  }

  beginTransaction() {
    this.openTransaction();
  }

  commitTransaction(description?: string) {
    if (!this.hasTransaction) throw new Error('No open transaction found');

    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const actions = this.activeTransaction!.getActions();
      const multiAction = createMultiAction(actions);
      if (description) multiAction._description = description;

      const transaction = this.closeTransaction();

      if (this.hasTransaction) {
        // Nested transaction: accept the multiAction into the now-active parent transaction
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.activeTransaction!.acceptAction(multiAction, null); // dataModel not needed here
      } else {
        // Outermost transaction: apply via original invocator
        this._actionManagerAddInterceptor.callOriginalInvocator(multiAction);
      }
    } catch {
      // if we failed to add our multi-action, this might be due to a lot of reasons
      // so at least, add them in their original manner with their original arguments
      if (!this.hasTransaction) {
        this._actionManagerAddInterceptor.executeOriginalLoggedRequests();
      }
    }
  }

  cancelTransaction() {
    this.activeTransaction?.undoAll();
    this.closeTransaction();
  }
}
