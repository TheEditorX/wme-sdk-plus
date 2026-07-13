/* eslint-disable @typescript-eslint/no-explicit-any */

import { MethodInterceptor } from '@wme-enhanced-sdk/method-interceptor';
import { getWindow } from '@wme-enhanced-sdk/utils';
import { DefineMiddlewareActionPointRule } from '../../define-middleware-action-point.js';

interface AddCommentData {
  /** The unique identifier of the Update Request being commented on. */
  readonly updateRequestId: number;

  /** The content of the comment's message */
  message: string;
}

function getCommentableClass() {
  return new Promise<any>((resolve) => {
    const eventName = 'problems:shown';
    const window = getWindow<{ W: any }>();
    const handler = async (problem: any) => {
      if (problem.type !== 'mapUpdateRequest') return;
      window.W.app.off(eventName, handler);
      const commentable =
        await window.W.problemsController.editController.adapter.getCommentable();
      resolve(commentable.constructor);
    };
    window.W.app.on(eventName, handler);
  });
}

export default new DefineMiddlewareActionPointRule<AddCommentData>({
  actionPoint: 'updateRequests.addComment',
  install: (triggerMiddlewares) => {
    let interceptor: MethodInterceptor<any, any> | null = null;
    getCommentableClass().then((UpdateRequestCommentable) => {
      interceptor = new MethodInterceptor(
        UpdateRequestCommentable.prototype,
        'addComment',
        async function (this: any, invoke, message, ...args) {
          const data = await triggerMiddlewares({
            updateRequestId: this.conversation.getID() as number,
            message: message as string,
          });
          if (!data) return;
          return invoke(data.message, ...args);
        }
      );
      interceptor.enable();
    });

    return () => {
      interceptor?.disable();
    };
  },
});
