import { WmeSDK } from 'wme-sdk-typings';
import { ISidebarTabSwitchController } from '@wme-enhanced-sdk/module-ui--sidebar-manager';
import { MethodInterceptor, CONTINUE_INVOCATION, interceptBeforeInvocation } from '@wme-enhanced-sdk/method-interceptor';
import { SharedStateManager } from '@wme-enhanced-sdk/shared-state';
import {
  ISelectionModeManager,
  SelectionModeOptions,
  SelectionModeResult,
  SelectionFilter,
  SelectableFeatureType,
} from './types.js';
import { OpenLayersSelectionController } from './openlayers-selection-controller.js';

/**
 * Validates if a feature matches the selection filter
 */
function matchesFilter(
  objectType: SelectableFeatureType,
  ids: Array<number | string>,
  filter: SelectionFilter,
): boolean {
  // Check if type is allowed and if IDs are in the allowed list
  if (filter.types && filter.types.length > 0 && !filter.types.includes(objectType)) {
    return false;
  }

  if (filter.allowedIds && filter.allowedIds.length > 0) {
    const hasAllowedId = ids.some(id => filter.allowedIds!.includes(id));
    if (!hasAllowedId) {
      return false;
    }
  }

  // For permanent hazards, we would need additional logic to check subtypes
  // This requires access to the actual feature data, which would be handled
  // at a higher level with access to the data model

  return true;
}

/**
 * Selection mode manager implementation
 * 
 * Manages a special selection mode that allows script writers to guide users
 * in selecting specific map features with filtering and custom behavior.
 * 
 * Features cross-instance coordination using shared window storage, ensuring
 * only one selection mode is active across all SDK+ instances at a time.
 */
export class SelectionModeManager implements ISelectionModeManager {
  private _isActive = false;
  private _currentOptions: SelectionModeOptions | null = null;
  private _currentSdk: WmeSDK | null = null;
  private _sidebarController: ISidebarTabSwitchController | null = null;
  private _selectionInterceptor: MethodInterceptor<any, 'setSelection'> | null = null;
  private _sharedStateManager: SharedStateManager;
  private _openLayersController: OpenLayersSelectionController | null = null;

  constructor(sidebarController?: ISidebarTabSwitchController) {
    this._sidebarController = sidebarController || null;
    this._sharedStateManager = new SharedStateManager({
      namespace: '__WME_SDK_PLUS_SELECTION_MODE__',
      staleLockTimeout: 60000,
    });
  }

  /**
   * Enters a special selection mode with filtering and custom behavior
   */
  enterSelectionMode(sdk: WmeSDK, options: SelectionModeOptions): SelectionModeResult {
    if (this._isActive) {
      throw new Error('Already in selection mode. Exit the current mode before entering a new one.');
    }

    // Try to acquire the cross-instance lock
    const lockResult = this._sharedStateManager.acquireLock('selectionMode');
    if (!lockResult.success) {
      throw new Error('Another SDK+ instance is already in selection mode. Only one selection mode can be active at a time.');
    }

    this._isActive = true;
    this._currentOptions = options;
    this._currentSdk = sdk;

    // Save current tab to restore later if needed
    if (options.keepCurrentTab && this._sidebarController) {
      this._sidebarController.saveCurrentTab();
    }

    // Prevent tab switching if requested
    if (options.preventTabSwitching !== false && this._sidebarController) {
      this._sidebarController.preventTabSwitching();
    }

    // Initialize OpenLayers-based selection control for comprehensive interception
    // This provides control over user clicks, hover states, and all selection methods
    this._openLayersController = new OpenLayersSelectionController(
      options.filter,
      (featureType, featureId) => {
        // Check if selection should be allowed
        if (!this._currentOptions) return false;
        
        const matches = matchesFilter(featureType, [featureId], this._currentOptions.filter);
        
        if (matches && this._currentOptions.onSelect) {
          this._currentOptions.onSelect({
            ids: [featureId],
            objectType: featureType,
          });
        }
        
        // If capture only, don't allow native selection
        return matches && !this._currentOptions.captureOnly;
      }
    );
    this._openLayersController.activate();

    // Also intercept SDK setSelection for scripts using the SDK API
    this._selectionInterceptor = new MethodInterceptor(
      sdk.Editing,
      'setSelection',
      interceptBeforeInvocation((selectionOptions) => {
        if (!this._isActive || !this._currentOptions) {
          return CONTINUE_INVOCATION;
        }

        const selection = selectionOptions.selection;
        const objectType = this._mapObjectTypeToSelectable(selection.objectType);

        // Validate against filter
        if (!matchesFilter(objectType, selection.ids, this._currentOptions.filter)) {
          // Don't allow this selection
          return undefined;
        }

        // If capture only, call the callback and prevent native selection
        if (this._currentOptions.captureOnly) {
          if (this._currentOptions.onSelect) {
            this._currentOptions.onSelect({
              ids: selection.ids,
              objectType,
            });
          }
          return undefined;
        }

        // Call the onSelect callback if provided
        if (this._currentOptions.onSelect) {
          this._currentOptions.onSelect({
            ids: selection.ids,
            objectType,
          });
        }

        // Allow the native selection to proceed
        return CONTINUE_INVOCATION;
      }),
    );

    this._selectionInterceptor.enable();

    // Return control object
    return {
      exit: () => this._exitSelectionMode(false),
      getFilter: () => ({ ...this._currentOptions!.filter }),
      updateFilter: (newFilter: Partial<SelectionFilter>) => {
        if (this._currentOptions) {
          this._currentOptions.filter = {
            ...this._currentOptions.filter,
            ...newFilter,
          };
          // Update OpenLayers controller filter too
          if (this._openLayersController) {
            this._openLayersController.updateFilter(newFilter);
          }
        }
      },
    };
  }

  /**
   * Checks if currently in selection mode
   */
  isInSelectionMode(): boolean {
    return this._isActive;
  }

  /**
   * Internal method to exit selection mode
   */
  private _exitSelectionMode(cancelled: boolean): void {
    if (!this._isActive) {
      return;
    }

    // Deactivate OpenLayers controller
    if (this._openLayersController) {
      this._openLayersController.deactivate();
      this._openLayersController = null;
    }

    // Restore tab switching
    if (this._currentOptions?.preventTabSwitching !== false && this._sidebarController) {
      this._sidebarController.allowTabSwitching();
    }

    // Restore original tab if needed
    if (this._currentOptions?.keepCurrentTab && this._sidebarController) {
      this._sidebarController.restoreSavedTab();
    }

    // Disable interceptor
    if (this._selectionInterceptor) {
      this._selectionInterceptor.disable();
      this._selectionInterceptor = null;
    }

    // Release the cross-instance lock
    this._sharedStateManager.releaseLock('selectionMode');

    // Call onCancel if cancelled
    if (cancelled && this._currentOptions?.onCancel) {
      this._currentOptions.onCancel();
    }

    // Clean up state
    this._isActive = false;
    this._currentOptions = null;
    this._currentSdk = null;
  }

  /**
   * Maps WME SDK object types to our selectable feature types
   */
  private _mapObjectTypeToSelectable(objectType: string): SelectableFeatureType {
    // Direct mapping for most types
    return objectType as SelectableFeatureType;
  }
}
