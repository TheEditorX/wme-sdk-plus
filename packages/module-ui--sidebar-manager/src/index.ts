import { DefinePropertyRule, SdkPatcherRule } from '@wme-enhanced-sdk/sdk-patcher';
import { UrlBasedSidebarTabSwitchController, ISidebarTabSwitchController } from './lib/sidebar-manager.js';

let sidebarTabController: ISidebarTabSwitchController;

function getSidebarTabController(): ISidebarTabSwitchController {
  if (!sidebarTabController) {
    sidebarTabController = new UrlBasedSidebarTabSwitchController();
  }
  return sidebarTabController;
}

export default [
  new DefinePropertyRule(
    'Sidebar.TabControl.preventTabSwitching',
    () => getSidebarTabController().preventTabSwitching(),
  ),
  new DefinePropertyRule(
    'Sidebar.TabControl.allowTabSwitching',
    () => getSidebarTabController().allowTabSwitching(),
  ),
  new DefinePropertyRule(
    'Sidebar.TabControl.isTabSwitchingPrevented',
    () => getSidebarTabController().isTabSwitchingPrevented(),
  ),
] as SdkPatcherRule[];

export { UrlBasedSidebarTabSwitchController, ISidebarTabSwitchController } from './lib/sidebar-manager.js';
