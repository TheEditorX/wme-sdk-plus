import { DefinePropertyRule, SdkPatcherRule } from '@wme-enhanced-sdk/sdk-patcher';
import { SidebarManager } from './lib/sidebar-manager.js';

let sidebarManager: SidebarManager;

function getSidebarManager(): SidebarManager {
  if (!sidebarManager) {
    sidebarManager = new SidebarManager();
  }
  return sidebarManager;
}

export default [
  new DefinePropertyRule(
    'UI.Sidebar.preventTabSwitching',
    () => getSidebarManager().preventTabSwitching(),
  ),
  new DefinePropertyRule(
    'UI.Sidebar.allowTabSwitching',
    () => getSidebarManager().allowTabSwitching(),
  ),
  new DefinePropertyRule(
    'UI.Sidebar.isTabSwitchingPrevented',
    () => getSidebarManager().isTabSwitchingPrevented(),
  ),
] as SdkPatcherRule[];

export { SidebarManager } from './lib/sidebar-manager.js';
