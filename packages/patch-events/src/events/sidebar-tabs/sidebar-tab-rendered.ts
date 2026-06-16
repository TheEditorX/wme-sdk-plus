import 'reflect-metadata';
import type { WmeSDK } from 'wme-sdk-typings';
import { getWindow } from '@wme-enhanced-sdk/utils';
import { createEventDefinition } from '../../lib/index.js';

const enum SidebarTabPanes {
  Areas = 'areas',
  Drives = 'drives',
  FeatureEditor = 'feature_editor',
  IssueTracker = 'issue_tracker',
  MTEs = 'mtes',
  None = 'none',
  Prefs = 'prefs',
  UserscriptTab = 'userscript_tab',
}

const SIDEBAR_TAB_PANES_TO_TYPES = {
  'sidepanel-issue-tracker': SidebarTabPanes.IssueTracker,
  'sidepanel-drives': SidebarTabPanes.Drives,
  'sidepanel-areas': SidebarTabPanes.Areas,
  'sidepanel-prefs': SidebarTabPanes.Prefs,
  'sidepanel-mtes': SidebarTabPanes.MTEs,
  'sidepanel-feature-editor': SidebarTabPanes.FeatureEditor,
}

const SIDEBAR_TAB_PANES_TO_SCRIPT_TYPES: Record<SidebarTabPanes, string> = {
  [SidebarTabPanes.None]: '',
  [SidebarTabPanes.FeatureEditor]: 'select',
  [SidebarTabPanes.IssueTracker]: 'solve',
  [SidebarTabPanes.MTEs]: 'events',
  [SidebarTabPanes.Prefs]: 'settings',
  [SidebarTabPanes.UserscriptTab]: 'scripts',
  [SidebarTabPanes.Drives]: 'drives',
  [SidebarTabPanes.Areas]: 'areas',
}

function isSidebarTabPane(node: Node): node is HTMLElement & { id: keyof typeof SIDEBAR_TAB_PANES_TO_TYPES } {
  return !!(
    node instanceof HTMLElement &&
      node.classList.contains('tab-pane') &&
      node.classList.contains('sidebar-tab-pane') &&
      node.id &&
      Object.prototype.hasOwnProperty.call(SIDEBAR_TAB_PANES_TO_TYPES, node.id)
  );
}

// Helper types to infer handler type for a specific event name from the SDK's `on` method
type OnArgs = Parameters<WmeSDK['Events']['on']>[0];
type ExtractEventPayload<T> = T extends ((payload: infer U) => Promise<void> | void) ? U : never;
type AllEventPayloads = ExtractEventPayload<OnArgs['eventHandler']>;
type SidebarTabOpenedPayload = Extract<AllEventPayloads, { domId: unknown, tabName: unknown }>;

export const sidebarTabRenderedEvent = createEventDefinition(
  'wme-sidebar-tab-opened',
  ({ trigger, eventBus }) => {
    const eventHandler = (payload: SidebarTabOpenedPayload) => {
      if (Reflect.getMetadata('wme-sdk:enriched', payload)) return;

      const window = getWindow();
      const tabElement = window.document.getElementById(payload.domId as string);

      const enrichedPayload = {
        tabName: payload.tabName,
        domId: payload.domId,
        tabType: tabElement && isSidebarTabPane(tabElement)
                    ? SIDEBAR_TAB_PANES_TO_SCRIPT_TYPES[SIDEBAR_TAB_PANES_TO_TYPES[tabElement.id]]
                    : undefined,
        tabElement: tabElement && isSidebarTabPane(tabElement) ? tabElement : undefined,
      };

      Reflect.defineMetadata('wme-sdk:enriched', true, enrichedPayload);

      trigger(enrichedPayload);
    };

    // this is essential to subscribe on the event bus directly instead of via SDK.Events.on,
    // because the latter is patched by us to support this "custom" event,
    // and the migration is dependant on an event with the same name being triggered before the patch is applied, so we can't rely on that
    eventBus.on('wme-sidebar-tab-opened', eventHandler);
    
    return () => {
      eventBus.off('wme-sidebar-tab-opened', eventHandler);
    };
  },
  {
    onSubscribed() {
      console.warn(
        '[WME SDK+]: Properties for this event deriving from SDK+ (tabType, tabElement) are deprecated and will be removed in a future version. Please use the native "wme-sidebar-tab-opened" event properties instead.'
      );
    },
  }
)
