# UI Sidebar Manager Module

This module provides functionality to temporarily prevent sidebar tab switching in the Waze Map Editor (WME).

## Purpose

When implementing custom selection modes or other features that need to maintain the current sidebar state, this module allows you to prevent the WME from automatically switching tabs.

## How It Works

The module intercepts `window.history.pushState` calls that only change the `tab` query parameter in the URL. This prevents the sidebar from switching tabs while still allowing other navigation to work normally.

## Architecture

The module follows a clean architecture with an interface-based design:

- **`ISidebarTabSwitchController`**: Interface defining the contract for sidebar tab switching control
- **`UrlBasedSidebarTabSwitchController`**: Implementation that intercepts URL-based tab navigation via `history.pushState`

This design allows for future implementations using different mechanisms if needed.

## Usage

### Via SDK

```typescript
// Prevent tab switching
sdk.Sidebar.preventTabSwitching();

// ... perform operations that would normally cause tab switches ...

// Allow tab switching again
sdk.Sidebar.allowTabSwitching();

// Check if tab switching is currently prevented
const isPrevented = sdk.Sidebar.isTabSwitchingPrevented();
```

### Direct Usage

```typescript
import { UrlBasedSidebarTabSwitchController } from '@wme-enhanced-sdk/module-ui--sidebar-manager';

const controller = new UrlBasedSidebarTabSwitchController();

// Prevent tab switching
controller.preventTabSwitching();

// ... perform operations ...

// Allow tab switching again
controller.allowTabSwitching();

// Clean up when done
controller.destroy();
```

## API Reference

### `ISidebarTabSwitchController` Interface

#### `preventTabSwitching(): void`
Prevents sidebar tab switching.

#### `allowTabSwitching(): void`
Allows sidebar tab switching.

#### `isTabSwitchingPrevented(): boolean`
Returns whether tab switching is currently prevented.

#### `destroy(): void`
Cleans up resources and restores original behavior.

### `UrlBasedSidebarTabSwitchController` Class

Implementation of `ISidebarTabSwitchController` that prevents tab switching by intercepting `history.pushState` calls that only change the 'tab' query parameter.

## Implementation Details

The URL-based controller uses the `MethodInterceptor` from `@wme-enhanced-sdk/method-interceptor` to intercept `window.history.pushState` calls. It only blocks calls that:
1. Have the same origin as the current page
2. Have the same pathname as the current page
3. Only differ in the `tab` query parameter

All other navigation is allowed to proceed normally.
