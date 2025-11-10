# UI Selection Mode Module

This module provides functionality to create special selection modes in the Waze Map Editor (WME), allowing script writers to guide users in selecting specific map features with filtering and custom behavior.

## Purpose

When building scripts that need users to select specific map features, this module provides a controlled selection environment with:
- Type filtering (e.g., only segments, only venues)
- ID-based whitelisting
- Subtype filtering for permanent hazards
- Optional tab switching prevention
- Capture-only mode for custom selection handling

## Features

- **Type Filtering**: Restrict selection to specific feature types
- **ID Whitelisting**: Only allow selection from a specific list of features
- **Subtype Filtering**: For permanent hazards, filter by subtype (e.g., school zones)
- **Tab Control**: Optionally prevent tab switching during selection
- **Capture Mode**: Intercept selections without performing native WME selection
- **Callbacks**: Get notified when features are selected or when selection is cancelled

## Usage

### Basic Selection Mode

```typescript
const selectionMode = sdk.Editing.enterSelectionMode({
  filter: {
    types: ['segment'], // Only allow segment selection
  },
  onSelect: (selection) => {
    console.log('Selected segments:', selection.ids);
    selectionMode.exit();
  },
});
```

### Multiple Feature Types

```typescript
const selectionMode = sdk.Editing.enterSelectionMode({
  filter: {
    types: ['segment', 'venue', 'bigJunction'], // Allow multiple types
  },
  onSelect: (selection) => {
    console.log(`Selected ${selection.objectType}:`, selection.ids);
  },
});

// Exit when done
setTimeout(() => selectionMode.exit(), 30000);
```

### ID Whitelisting

```typescript
const allowedSegmentIds = [12345, 67890, 11111];

const selectionMode = sdk.Editing.enterSelectionMode({
  filter: {
    types: ['segment'],
    allowedIds: allowedSegmentIds, // Only these segments can be selected
  },
  onSelect: (selection) => {
    console.log('Selected allowed segment:', selection.ids[0]);
  },
});
```

### Capture-Only Mode

```typescript
// Don't perform native selection, just capture the selection attempt
const selectionMode = sdk.Editing.enterSelectionMode({
  filter: {
    types: ['segment'],
  },
  captureOnly: true, // Don't actually select, just capture
  onSelect: (selection) => {
    console.log('User clicked on segment:', selection.ids[0]);
    // Handle the selection in your own way
    processSegment(selection.ids[0]);
  },
});
```

### With Tab Control

```typescript
const selectionMode = sdk.Editing.enterSelectionMode({
  filter: {
    types: ['venue'],
  },
  preventTabSwitching: true, // Prevent tab switching (default: true)
  keepCurrentTab: true,      // Restore original tab when done (default: true)
  onSelect: (selection) => {
    console.log('Selected venue:', selection.ids[0]);
  },
});
```

### Dynamic Filter Updates

```typescript
const selectionMode = sdk.Editing.enterSelectionMode({
  filter: {
    types: ['segment'],
  },
  onSelect: (selection) => {
    console.log('Selected:', selection.ids);
  },
});

// Later, update the filter to allow venues too
selectionMode.updateFilter({
  types: ['segment', 'venue'],
});

// Or change the allowed IDs
selectionMode.updateFilter({
  allowedIds: [1, 2, 3, 4, 5],
});
```

### Permanent Hazard Filtering

```typescript
const selectionMode = sdk.Editing.enterSelectionMode({
  filter: {
    types: ['permanentHazard'],
    permanentHazardSubtypes: ['schoolZone'], // Only school zones
  },
  onSelect: (selection) => {
    console.log('Selected school zone:', selection.ids[0]);
  },
});
```

### With Cancellation

```typescript
const selectionMode = sdk.Editing.enterSelectionMode({
  filter: {
    types: ['segment'],
  },
  onSelect: (selection) => {
    console.log('Selected:', selection.ids);
  },
  onCancel: () => {
    console.log('Selection was cancelled');
  },
});

// Cancel after 30 seconds
setTimeout(() => {
  selectionMode.exit(); // This won't trigger onCancel
}, 30000);
```

## API Reference

### `sdk.Editing.enterSelectionMode(options: SelectionModeOptions): SelectionModeResult`

Enters a special selection mode with the specified options.

**Parameters:**
- `options.filter`: Selection filter criteria
  - `types?: SelectableFeatureType[]`: Allowed feature types
  - `allowedIds?: Array<number | string>`: Specific IDs allowed
  - `permanentHazardSubtypes?: PermanentHazardSubtype[]`: Permanent hazard subtypes
- `options.preventTabSwitching?: boolean`: Prevent tab switching (default: true)
- `options.keepCurrentTab?: boolean`: Keep current tab open (default: true)
- `options.captureOnly?: boolean`: Only capture, don't perform native selection (default: false)
- `options.onSelect?: (selection) => void`: Called when a feature is selected
- `options.onCancel?: () => void`: Called when selection mode is cancelled

**Returns:** `SelectionModeResult` with:
- `exit()`: Exits the selection mode
- `getFilter()`: Gets the current filter
- `updateFilter(filter)`: Updates the filter dynamically

### `sdk.Editing.isInSelectionMode(): boolean`

Returns whether currently in a special selection mode.

## Selectable Feature Types

- `segment`: Road segments
- `venue`: Points of interest
- `bigJunction`: Big junctions
- `node`: Junction nodes
- `mapComment`: Map comments
- `city`: Cities
- `restrictedDrivingArea`: Restricted driving areas
- `permanentHazard`: Permanent hazards (speed bumps, school zones, etc.)
- `segmentSuggestion`: Segment suggestions

## Permanent Hazard Subtypes

- `schoolZone`
- `railroadCrossing`
- `speedBump`
- `sharpCurve`
- `dangerousTurn`

## Implementation Details

The module uses `MethodInterceptor` to intercept `sdk.Editing.setSelection()` calls and applies filtering logic. It integrates with the `module-ui--sidebar-manager` to provide tab switching control.

## Integration with Sidebar Manager

This module depends on `@wme-enhanced-sdk/module-ui--sidebar-manager` for tab switching prevention functionality. The sidebar controller is automatically initialized when needed.
