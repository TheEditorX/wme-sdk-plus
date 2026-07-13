import { SdkPatcherRule } from '@wme-enhanced-sdk/sdk-patcher';
import EditingTransactionsHook from '@wme-enhanced-sdk/patch-editing--transactions';
import EditingCustomActionsHook from '@wme-enhanced-sdk/patch-editing--custom-actions';
import DataModelMapCommentsHook from '@wme-enhanced-sdk/patch-datamodel--mapcomments';
import DataModelPermanentHazardsHook from '@wme-enhanced-sdk/patch-datamodel--permanenthazards';
import DataModelBigJunctionsModule from '@wme-enhanced-sdk/patch-datamodel--bigjunctions';
import DataModelInterceptorsModule from '@wme-enhanced-sdk/patch-datamodel--interceptors';
import MiddlewareModule from '@wme-enhanced-sdk/patch-middleware';
import EventsModule from '@wme-enhanced-sdk/patch-events';

interface ListedHook {
  hook: SdkPatcherRule[];
  deps?: string[];
}

const allHooks: Record<string, ListedHook> = {
  'Editing.Transactions': { hook: EditingTransactionsHook },
  'Editing.CustomActions': { hook: EditingCustomActionsHook },
  'DataModel.MapComments': { hook: DataModelMapCommentsHook },
  'DataModel.PermanentHazards': { hook: DataModelPermanentHazardsHook },
  'DataModel.BigJunctions': { hook: DataModelBigJunctionsModule },
  'DataModel.Interceptors': { hook: DataModelInterceptorsModule, deps: ['Middlewares'] },
  'Events': { hook: EventsModule },
  'Middlewares': { hook: MiddlewareModule },
};

export default allHooks;
