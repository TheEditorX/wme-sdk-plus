/* eslint-disable @typescript-eslint/no-explicit-any */
import { getWindow } from '@wme-enhanced-sdk/utils';
import { SelectionFilter, SelectableFeatureType } from './types.js';
import { WazeWindow, getLayerForFeatureType, getFeatureFromLayer, getFeaturesFromPermanentHazardLayers } from './waze-map-helpers.js';

/**
 * Controller for intercepting OpenLayers-level selection events
 * 
 * This provides comprehensive selection control by:
 * - Intercepting direct user clicks on map features
 * - Controlling hover states
 * - Working across all scripts and selection methods
 */
export class OpenLayersSelectionController {
  private _window: WazeWindow;
  private _filter: SelectionFilter;
  private _onAttemptSelect?: (featureType: SelectableFeatureType, featureId: number | string) => boolean;
  private _originalSelectControl: any = null;
  private _isActive = false;

  constructor(
    filter: SelectionFilter,
    onAttemptSelect?: (featureType: SelectableFeatureType, featureId: number | string) => boolean
  ) {
    this._window = getWindow() as WazeWindow;
    this._filter = filter;
    this._onAttemptSelect = onAttemptSelect;
  }

  /**
   * Activates the OpenLayers selection control
   */
  activate(): void {
    if (this._isActive) return;
    
    const wazeMap = this._window.W?.map;
    if (!wazeMap) {
      console.warn('WME map not available for OpenLayers selection control');
      return;
    }

    // TODO: Implement OpenLayers event interception
    // This would involve:
    // 1. Accessing W.selectionManager or equivalent
    // 2. Intercepting feature selection events
    // 3. Filtering based on our criteria
    // 4. Preventing selection if feature doesn't match filter
    
    this._isActive = true;
  }

  /**
   * Deactivates the OpenLayers selection control
   */
  deactivate(): void {
    if (!this._isActive) return;
    
    // TODO: Restore original selection behavior
    
    this._isActive = false;
  }

  /**
   * Updates the filter dynamically
   */
  updateFilter(filter: Partial<SelectionFilter>): void {
    this._filter = { ...this._filter, ...filter };
  }

  /**
   * Checks if a feature matches the current filter
   */
  private _matchesFilter(featureType: SelectableFeatureType, featureId: number | string): boolean {
    // Check type filter
    if (this._filter.types && this._filter.types.length > 0) {
      if (!this._filter.types.includes(featureType)) {
        return false;
      }
    }

    // Check ID whitelist
    if (this._filter.allowedIds && this._filter.allowedIds.length > 0) {
      if (!this._filter.allowedIds.includes(featureId)) {
        return false;
      }
    }

    // For permanent hazards, check subtypes
    if (featureType === 'permanentHazard' && this._filter.permanentHazardSubtypes) {
      // TODO: Access feature data and check subtype
      // This would require accessing the actual feature object and checking its type
    }

    return true;
  }

  /**
   * Validates if a feature can be selected
   */
  canSelectFeature(featureType: SelectableFeatureType, featureId: number | string): boolean {
    const matches = this._matchesFilter(featureType, featureId);
    
    if (this._onAttemptSelect) {
      return this._onAttemptSelect(featureType, featureId) && matches;
    }
    
    return matches;
  }
}
