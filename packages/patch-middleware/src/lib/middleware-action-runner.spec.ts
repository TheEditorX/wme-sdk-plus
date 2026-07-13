/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { MiddlewarePreventedError } from '../errors/index.js';
import { MiddlewareActionRunner } from './middleware-action-runner.js';

function returnValue(data: { value: string }) {
  return data.value;
}

describe('MiddlewareActionRunner', () => {
  test('Run without middleware handlers', async () => {
    const finalAction = vitest.fn(returnValue);

    const initialData = { value: 'Hello World' };
    await new MiddlewareActionRunner(
      'test',
      initialData,
      null!,
      [],
    ).run(finalAction);
    
    expect(finalAction).toBeCalled();
    expect(finalAction).toReturnWith(initialData.value);
  });

  test('Run with monitoring single middleware', async () => {
    const finalAction = vitest.fn(returnValue);

    const initialData = { value: 'Hello World' };
    await new MiddlewareActionRunner(
      'test',
      initialData,
      null!,
      [
        (context, next) => {
          expect(typeof context.data).toBe('object');
          expect(typeof context.originalData).toBe('object');
          expect(context.data.value).toBe(initialData.value);
          expect(context.originalData.value).toBe(initialData.value);
          expect(context.data).not.toBe(context.originalData);
          next();
        }
      ],
    ).run(finalAction);
    
    expect(finalAction).toBeCalled();
    expect(finalAction).toReturnWith(initialData.value);
  });

  test('Run with mutating middleware', async () => {
    const finalAction = vitest.fn(returnValue);

    const initialData = { value: 'Hello World' };
    const valueToReplace = 'Replaced';

    await new MiddlewareActionRunner(
      'test',
      initialData,
      null!,
      [
        (context, next) => {
          expect(typeof context.data).toBe('object');
          expect(typeof context.originalData).toBe('object');
          expect(context.data.value).toBe(initialData.value);
          expect(context.originalData.value).toBe(initialData.value);
          expect(context.data).not.toBe(context.originalData);

          context.data.value = valueToReplace;
          expect(context.data.value).toBe(valueToReplace);
          expect(context.originalData.value).toBe(initialData.value);
          next();
        },
        (context, next) => {
          expect(typeof context.data).toBe('object');
          expect(typeof context.originalData).toBe('object');
          expect(context.data.value).toBe(valueToReplace);
          expect(context.originalData.value).toBe(initialData.value);
          expect(context.data).not.toBe(context.originalData);

          context.data.value = valueToReplace + ' Again';
          next();
        }
      ],
    ).run(finalAction);
    
    expect(finalAction).toBeCalled();
    expect(finalAction).toReturnWith(valueToReplace + ' Again');
  });

  // Behaviour change: not calling next() now prevents the chain (returns null) and emits a warning.
  // Previously, the runner would auto-call next() and continue – this was confusing and dangerous.
  test('Run with middleware not calling next prevents the chain and warns', async () => {
    const finalAction = vitest.fn(returnValue);
    const consoleWarnMock = vitest.spyOn(console, 'warn').mockImplementationOnce(() => undefined);

    const initialData = { value: 'Hello World' };

    const result = await new MiddlewareActionRunner<typeof initialData, ReturnType<typeof returnValue>>(
      'test',
      initialData,
      null!,
      [
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => {},
        (context, next) => {
          context.data.value += ' from Middleware';
          next();
        },
      ],
    ).run(finalAction);
    
    expect(result).toBeNull();
    expect(finalAction).not.toBeCalled();
    expect(consoleWarnMock).toBeCalled();
  });

  test('Run with middleware returning null (explicit cancellation)', async () => {
    const finalAction = vitest.fn(returnValue);
    const consoleWarnMock = vitest.spyOn(console, 'warn');

    const initialData = { value: 'Hello World' };

    const result = await new MiddlewareActionRunner<typeof initialData, ReturnType<typeof returnValue>>(
      'test',
      initialData,
      null!,
      [
        () => null,
        (context, next) => {
          context.data.value += ' from Middleware';
          next();
        },
      ],
    ).run(finalAction);

    expect(result).toBeNull();
    expect(finalAction).not.toBeCalled();
    expect(consoleWarnMock).not.toBeCalled();
  });

  test('Run with middleware returning false (explicit cancellation)', async () => {
    const finalAction = vitest.fn(returnValue);
    const consoleWarnMock = vitest.spyOn(console, 'warn');

    const initialData = { value: 'Hello World' };

    const result = await new MiddlewareActionRunner<typeof initialData, ReturnType<typeof returnValue>>(
      'test',
      initialData,
      null!,
      [
        () => false,
        (context, next) => {
          context.data.value += ' from Middleware';
          next();
        },
      ],
    ).run(finalAction);

    expect(result).toBeNull();
    expect(finalAction).not.toBeCalled();
    expect(consoleWarnMock).not.toBeCalled();
  });

  test('Run with middleware next return value', async () => {
    const finalAction = vitest.fn(returnValue);

    const initialData = { value: 'Hello World' };

    await new MiddlewareActionRunner<typeof initialData, ReturnType<typeof returnValue>>(
      'test',
      initialData,
      null!,
      [
        async (context, next) => {
          context.data.value += ' from Middleware';
          const result = await next();
          expect(result).toBe(initialData.value + ' from Middleware');
        },
      ],
    ).run(finalAction);
    
    expect(finalAction).toBeCalled();
    expect(finalAction).toReturnWith(initialData.value + ' from Middleware');
  });

  test('Run with middleware preventing execution', async () => {
    const finalAction = vitest.fn(returnValue);

    const initialData = { value: 'Hello World' };

    await new MiddlewareActionRunner<typeof initialData, ReturnType<typeof returnValue>>(
      'test',
      initialData,
      null!,
      [
        () => {
          throw new MiddlewarePreventedError();
        },
      ],
    ).run(finalAction);
    
    expect(finalAction).not.toBeCalled();
  });

  test('Run with middleware preventing execution asynchronously', async () => {
    vitest.useFakeTimers();

    const finalAction = vitest.fn(returnValue);

    const initialData = { value: 'Hello World' };

    await new MiddlewareActionRunner<typeof initialData, ReturnType<typeof returnValue>>(
      'test',
      initialData,
      null!,
      [
        async () => {
          await new Promise((resolve) => {
            setTimeout(resolve, 1000);
            vitest.advanceTimersByTime(1000);
          });
          throw new MiddlewarePreventedError();
        },
      ],
    ).run(finalAction);
    
    expect(finalAction).not.toBeCalled();
  });

  test('Run with middleware throwing unexpected error', async () => {
    const finalAction = vitest.fn(returnValue);

    const initialData = { value: 'Hello World' };

    const runner = new MiddlewareActionRunner<typeof initialData, ReturnType<typeof returnValue>>(
      'test',
      initialData,
      null!,
      [
        () => {
          throw new Error('Unexpected Error');
        },
      ],
    );

    expect(runner.run(finalAction)).rejects.toBeInstanceOf(Error);
    expect(finalAction).not.toBeCalled();
  });
});
