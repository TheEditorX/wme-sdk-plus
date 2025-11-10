import { SdkPatcherRule } from '@wme-enhanced-sdk/sdk-patcher';
import EditingTransactionsHook from '@wme-enhanced-sdk/patch-editing--transactions';
import DataModelMapCommentsHook from '@wme-enhanced-sdk/patch-datamodel--mapcomments';
import DataModelPermanentHazardsHook from '@wme-enhanced-sdk/patch-datamodel--permanenthazards';
import DataModelBigJunctionsModule from '@wme-enhanced-sdk/patch-datamodel--bigjunctions';
import MiddlewareModule from '@wme-enhanced-sdk/patch-middleware';
import EventsModule from '@wme-enhanced-sdk/patch-events';
import SidebarManagerModule from '@wme-enhanced-sdk/module-ui--sidebar-manager';
import SelectionModeModule from '@wme-enhanced-sdk/module-ui--selection-mode';

interface ListedHook {
  hook: SdkPatcherRule[];
  deps?: string[];
}

const allHooks: Record<string, ListedHook> = {
  'Editing.Transactions': { hook: EditingTransactionsHook },
  'DataModel.MapComments': { hook: DataModelMapCommentsHook },
  'DataModel.PermanentHazards': { hook: DataModelPermanentHazardsHook },
  'DataModel.BigJunctions': { hook: DataModelBigJunctionsModule },
  'Events': { hook: EventsModule },
  'Middlewares': { hook: MiddlewareModule },
  'UI.SidebarManager': { hook: SidebarManagerModule },
  'UI.SelectionMode': { hook: SelectionModeModule, deps: ['UI.SidebarManager'] },
};

export default allHooks;
