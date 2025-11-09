# UI Sidebar Manager Module

This module provides functionality to temporarily prevent sidebar tab switching in the Waze Map Editor (WME).

## Purpose

When implementing custom selection modes or other features that need to maintain the current sidebar state, this module allows you to prevent the WME from automatically switching tabs.

## How It Works

The module intercepts `window.history.pushState` calls that only change the `tab` query parameter in the URL. This prevents the sidebar from switching tabs while still allowing other navigation to work normally.

## Usage

### Via SDK

```typescript
// Prevent tab switching
sdk.UI.Sidebar.preventTabSwitching();

// ... perform operations that would normally cause tab switches ...

// Allow tab switching again
sdk.UI.Sidebar.allowTabSwitching();

// Check if tab switching is currently prevented
const isPrevented = sdk.UI.Sidebar.isTabSwitchingPrevented();
```

### Direct Usage

```typescript
import { SidebarManager } from '@wme-enhanced-sdk/module-ui--sidebar-manager';

const manager = new SidebarManager();

// Prevent tab switching
manager.preventTabSwitching();

// ... perform operations ...

// Allow tab switching again
manager.allowTabSwitching();

// Clean up when done
manager.destroy();
```

## API Reference

### `preventTabSwitching(): void`
Prevents sidebar tab switching by intercepting history.pushState calls that only change the 'tab' query parameter.

### `allowTabSwitching(): void`
Allows sidebar tab switching by disabling the history.pushState interception.

### `isTabSwitchingPrevented(): boolean`
Returns whether tab switching is currently prevented.

### `destroy(): void`
Cleans up the interceptor and restores original behavior. Should be called when the manager is no longer needed.

## Implementation Details

The module uses the `MethodInterceptor` from `@wme-enhanced-sdk/method-interceptor` to intercept `window.history.pushState` calls. It only blocks calls that:
1. Have the same origin as the current page
2. Have the same pathname as the current page
3. Only differ in the `tab` query parameter

All other navigation is allowed to proceed normally.
