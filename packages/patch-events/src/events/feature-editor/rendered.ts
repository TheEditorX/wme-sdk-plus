import type { WmeSDK } from 'wme-sdk-typings';
import { createEventDefinition } from '../../lib/index.js';

// Helper types to infer handler type for a specific event name from the SDK's `on` method
type OnArgs = Parameters<WmeSDK['Events']['on']>[0];
type ExtractEventPayload<T> = T extends ((payload: infer U) => Promise<void> | void) ? U : never;
type AllEventPayloads = ExtractEventPayload<OnArgs['eventHandler']>;

type FeatureEditorOpenedPayload = Extract<AllEventPayloads, { featureType: any }>;

export const featureEditorRenderedEventDefinition = createEventDefinition(
  'wme-feature-editor-rendered',
  ({ wmeSdk, trigger }) => {
    console.warn('[WME SDK+]: Event "wme-feature-editor-rendered" is deprecated. Please use native "wme-feature-editor-opened" instead.');

    const eventHandler = ({ featureType }: FeatureEditorOpenedPayload) => {
      trigger({
        featureType,
      });
    };

    wmeSdk.Events.on({
      eventName: 'wme-feature-editor-opened',
      eventHandler,
    });

    return () => {
      // Unsubscribe from SDK event and disconnect the observer
      wmeSdk.Events.off({
        eventName: 'wme-feature-editor-opened',
        eventHandler,
      });
    }
  },
)
