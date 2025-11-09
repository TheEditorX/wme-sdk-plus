import { WmeSDK } from 'wme-sdk-typings';

/**
 * Types of features that can be selected
 */
export type SelectableFeatureType = 
  | 'segment'
  | 'venue'
  | 'bigJunction'
  | 'node'
  | 'mapComment'
  | 'city'
  | 'restrictedDrivingArea'
  | 'permanentHazard'
  | 'segmentSuggestion';

/**
 * Permanent hazard subtypes for filtering
 */
export type PermanentHazardSubtype =
  | 'schoolZone'
  | 'railroadCrossing'
  | 'speedBump'
  | 'sharp Curve'
  | 'dangerousTurn';

/**
 * Options for filtering feature selection
 */
export interface SelectionFilter {
  /**
   * Feature types allowed in the selection
   */
  types?: SelectableFeatureType[];

  /**
   * Specific feature IDs allowed (if provided, only these can be selected)
   */
  allowedIds?: Array<number | string>;

  /**
   * For permanent hazards, filter by subtype
   */
  permanentHazardSubtypes?: PermanentHazardSubtype[];
}

/**
 * Behavior options for the selection mode
 */
export interface SelectionModeOptions {
  /**
   * Filter criteria for which features can be selected
   */
  filter: SelectionFilter;

  /**
   * Whether to prevent tab switching during selection (default: true)
   */
  preventTabSwitching?: boolean;

  /**
   * Whether to keep the current tab open after selection (default: true)
   */
  keepCurrentTab?: boolean;

  /**
   * If true, passes the selection to the callback without performing native WME selection
   * This allows the script to handle the selection its own way (default: false)
   */
  captureOnly?: boolean;

  /**
   * Callback invoked when a feature is selected
   */
  onSelect?: (selection: {
    ids: Array<number | string>;
    objectType: SelectableFeatureType;
  }) => void;

  /**
   * Callback invoked when the selection mode is cancelled
   */
  onCancel?: () => void;
}

/**
 * Result of entering selection mode
 */
export interface SelectionModeResult {
  /**
   * Exits the selection mode
   */
  exit: () => void;

  /**
   * Gets the current filter
   */
  getFilter: () => SelectionFilter;

  /**
   * Updates the filter dynamically
   */
  updateFilter: (filter: Partial<SelectionFilter>) => void;
}

/**
 * Interface for managing special selection modes
 */
export interface ISelectionModeManager {
  /**
   * Enters a special selection mode with the given options
   */
  enterSelectionMode(sdk: WmeSDK, options: SelectionModeOptions): SelectionModeResult;

  /**
   * Checks if currently in selection mode
   */
  isInSelectionMode(): boolean;
}
