import { SdkPatcherRule } from '@wme-enhanced-sdk/sdk-patcher';
import { featureEditorRenderedEventDefinition } from './events/index.js';
import { EventDefinition } from './interfaces/event-definition.js';
import { EventEffectDestructor } from './interfaces/event-effect.js';
import { MethodInterceptor } from '@wme-enhanced-sdk/method-interceptor';

const EVENT_CLEANUPS_SYMBOL = Symbol('EVENT CLEANUPS');
const EVENTS = [
  featureEditorRenderedEventDefinition,
];

function getEventByName(eventName: string): EventDefinition | null {
  return EVENTS.find((event) => event.eventName === eventName) || null;
}

export default [
  {
    install({ sdk, artifacts }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eventBus = (sdk.Events as any).eventBus;
      const eventCleanups: EventEffectDestructor[] = [];
      EVENTS.forEach((eventDefinition) => {
        const cleanup = eventDefinition.effect({
          wmeSdk: sdk,
          eventBus: eventBus,
          trigger(detail) {
            eventBus.trigger(
              eventDefinition.eventName,
              detail,
            );
          },
        });
        if (cleanup) eventCleanups.push(cleanup);
      });
      artifacts[EVENT_CLEANUPS_SYMBOL] = eventCleanups;
    },
    uninstall({ artifacts }) {
      const effectCleanups: EventEffectDestructor[] = artifacts[EVENT_CLEANUPS_SYMBOL];
      effectCleanups.forEach((cleanup) => cleanup());
    }
  },
  ({ sdk }) => {
    const methodInterceptor = new MethodInterceptor(
      sdk.Events,
      'on',
      (trigger, options, ...restArgs) => {
        const triggerDefault = () => trigger(options, ...restArgs);

        const { eventName, eventHandler } = options;
        // we only process if we expect the shape: 1 arg only, we have an eventName of ours events, and an event handler
        if (restArgs.length || !eventName || !eventHandler) return triggerDefault();

        const eventDefinition = getEventByName(eventName);
        if (!eventDefinition) return triggerDefault();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (sdk.Events as any).eventBus.on(eventName, eventHandler);
        eventDefinition.onSubscribed?.();
        return result;
      }
    );

    methodInterceptor.enable();

    return () => {
      return methodInterceptor.disable();
    }
  },

  ({ sdk }) => {
    const methodInterceptor = new MethodInterceptor(
      sdk.Events,
      'once',
      (trigger, options, ...restArgs) => {
        const triggerDefault = () => trigger(options, ...restArgs);

        const { eventName } = options;
        // we only process if we expect the shape: 1 arg only, we have an eventName of ours events, and an event handler
        if (restArgs.length || !eventName) return triggerDefault();

        const eventDefinition = getEventByName(eventName);
        if (!eventDefinition) return triggerDefault();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (sdk.Events as any).eventBus.once(eventName);
        eventDefinition.onSubscribed?.();
        return result;
      }
    );

    methodInterceptor.enable();

    return () => {
      return methodInterceptor.disable();
    }
  },

  ({ sdk }) => {
    const methodInterceptor = new MethodInterceptor(
      sdk.Events,
      'off',
      (trigger, options, ...restArgs) => {
        const triggerDefault = () => trigger(options, ...restArgs);

        const { eventName, eventHandler } = options;
        // we only process if we expect the shape: 1 arg only, we have an eventName of ours events, and an event handler
        if (restArgs.length || !eventName) return triggerDefault();

        const eventDefinition = getEventByName(eventName);
        if (!eventDefinition) return triggerDefault();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (sdk.Events as any).eventBus.off(eventName, eventHandler);
        eventDefinition.onUnsubscribed?.();
        return result;
      }
    );

    methodInterceptor.enable();

    return () => {
      return methodInterceptor.disable();
    }
  },
] as SdkPatcherRule[];
