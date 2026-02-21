import { Closure } from '../interfaces/closure.js';

function deepEqual<T>(a: T, b: T): boolean {
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  if (a === null || b === null) return a === b;

  return Object.keys(a).every((key) => {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    const aValue = (a as any)[key], bValue = (b as any)[key];
    return deepEqual(aValue, bValue);
  });
}

/**
 * Checks whether the given closure is in within the given array. This compares the closure's properties rather than checks for reference equity.
 * @param closure The closure object to test
 * @param array The array to check in
 */
function hasClosure(closure: Partial<Closure>, array: Partial<Closure>[]): boolean {
  return array.some((c) => deepEqual(c, closure));
}

export function compareClosuresArrays(a: Partial<Closure>[], b: Partial<Closure>[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((closure) => hasClosure(closure, b));
}
