import { describe, it, expect, beforeEach } from 'vitest';
import { Stack } from './stack';

describe('Stack', () => {
  let stack: Stack<number>;

  beforeEach(() => {
    stack = new Stack<number>();
  });

  it('should push items onto the stack', () => {
    stack.push(1);
    stack.push(2);
    expect(stack.size).toBe(2);
  });

  it('should pop items from the stack', () => {
    stack.push(1);
    stack.push(2);
    const popped = stack.pop();
    expect(popped).toBe(2);
    expect(stack.size).toBe(1);
  });

  it('should peek at the top item', () => {
    stack.push(1);
    stack.push(2);
    expect(stack.peek()).toBe(2);
    expect(stack.size).toBe(2);
  });

  it('should be empty initially', () => {
    expect(stack.isEmpty).toBe(true);
    expect(stack.size).toBe(0);
  });

  it('should clear the stack', () => {
    stack.push(1);
    stack.push(2);
    stack.clear();
    expect(stack.isEmpty).toBe(true);
    expect(stack.size).toBe(0);
  });
});
