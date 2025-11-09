import { DefinePropertyRule, SdkPatcherRule, SdkPatcherRuleOperationArgs } from '@wme-enhanced-sdk/sdk-patcher';
import { UrlBasedSidebarTabSwitchController, ISidebarTabSwitchController } from '@wme-enhanced-sdk/module-ui--sidebar-manager';
import { SelectionModeManager } from './lib/selection-mode-manager.js';
import { ISelectionModeManager, SelectionModeOptions } from './lib/types.js';

let selectionModeManager: ISelectionModeManager;
let sidebarController: ISidebarTabSwitchController;

function getSelectionModeManager(): ISelectionModeManager {
  if (!selectionModeManager) {
    if (!sidebarController) {
      sidebarController = new UrlBasedSidebarTabSwitchController();
    }
    selectionModeManager = new SelectionModeManager(sidebarController);
  }
  return selectionModeManager;
}

export default [
  new DefinePropertyRule(
    'Editing.enterSelectionMode',
    ({ sdk }: SdkPatcherRuleOperationArgs) => {
      return (options: SelectionModeOptions) => {
        return getSelectionModeManager().enterSelectionMode(sdk, options);
      };
    },
    { isFactory: true }
  ),
  new DefinePropertyRule(
    'Editing.isInSelectionMode',
    () => getSelectionModeManager().isInSelectionMode(),
  ),
] as SdkPatcherRule[];

export * from './lib/types.js';
export { SelectionModeManager } from './lib/selection-mode-manager.js';
