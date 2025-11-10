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
    'Sidebar.preventTabSwitching',
    () => getSidebarTabController().preventTabSwitching(),
  ),
  new DefinePropertyRule(
    'Sidebar.allowTabSwitching',
    () => getSidebarTabController().allowTabSwitching(),
  ),
  new DefinePropertyRule(
    'Sidebar.isTabSwitchingPrevented',
    () => getSidebarTabController().isTabSwitchingPrevented(),
  ),
] as SdkPatcherRule[];

export { UrlBasedSidebarTabSwitchController, ISidebarTabSwitchController } from './lib/sidebar-manager.js';
