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

export const sidebarTabRenderedEvent = createEventDefinition(
  'wme-sidebar-tab-rendered',
  ({ trigger }) => {
    const triggerForSidebarTab = (tabElement: HTMLElement & { id: keyof typeof SIDEBAR_TAB_PANES_TO_TYPES }) => {
      const tabType = SIDEBAR_TAB_PANES_TO_TYPES[tabElement.id];
      if (!tabType) return;
      trigger({
        tabType: SIDEBAR_TAB_PANES_TO_SCRIPT_TYPES[tabType],
        tabElement,
      });
    }

    const mutationObserver = new MutationObserver((mutations, observer) => {
      for (const mutation of mutations) {
        switch (mutation.type) {
          case 'childList':
            mutation.addedNodes.forEach((node) => {
              if (!isSidebarTabPane(node)) return;
              triggerForSidebarTab(node);
              observer.observe(node, {
                attributes: true,
              });
            });
            break;
          case 'attributes': {
            if (mutation.attributeName !== 'id') return;
            if (!isSidebarTabPane(mutation.target)) return;
            triggerForSidebarTab(mutation.target);
            break;
          }
        }
      }
    });

    const sidebarContentEl = document.getElementById('sidebarContent');
    const tabContentEl = sidebarContentEl?.getElementsByClassName('tab-content')[0];
    if (tabContentEl) {
      mutationObserver.observe(
        tabContentEl,
        {
          childList: true,
        },
      );
      // observe also all rendered tabs
      const allTabPanes = Array.from(tabContentEl.getElementsByClassName('sidebar-tab-pane'));
      for (const tabPane of allTabPanes) {
        if (!isSidebarTabPane(tabPane)) continue;
        mutationObserver.observe(tabPane, {
          attributes: true,
        });
      }
    }

    return () => {
      mutationObserver.disconnect();
    };
  }
)
