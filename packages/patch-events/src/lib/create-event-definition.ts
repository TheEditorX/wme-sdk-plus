import { EventDefinition } from '../interfaces/event-definition.js';
import { EventEffect } from '../interfaces/event-effect.js';

interface EventDefinitionOptions {
  onSubscribed?(): void;
  onUnsubscribed?(): void;
}

export function createEventDefinition(
  eventName: string,
  eventEffect: EventEffect,
  options?: EventDefinitionOptions,
): EventDefinition {
  return {
    eventName,
    effect: eventEffect,
    onSubscribed: options?.onSubscribed,
    onUnsubscribed: options?.onUnsubscribed,
  };
}
