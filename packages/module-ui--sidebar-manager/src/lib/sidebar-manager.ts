import { MethodInterceptor, CONTINUE_INVOCATION, interceptBeforeInvocation } from '@wme-enhanced-sdk/method-interceptor';

/**
 * Checks if two URLs have the same origin (protocol, hostname, and port)
 */
function isSameOrigin(url1: URL, url2: URL): boolean {
  return url1.protocol === url2.protocol && url1.hostname === url2.hostname && url1.port === url2.port;
}

/**
 * Checks if two URLs have the same pathname (without query string or hash)
 */
function isSamePath(url1: URL, url2: URL): boolean {
  return url1.pathname === url2.pathname;
}

/**
 * Interface for managing sidebar tab switching behavior
 * 
 * Implementations of this interface provide mechanisms to temporarily prevent
 * the WME sidebar from switching tabs.
 */
export interface ISidebarTabSwitchController {
  /**
   * Prevents sidebar tab switching
   */
  preventTabSwitching(): void;

  /**
   * Allows sidebar tab switching
   */
  allowTabSwitching(): void;

  /**
   * Returns whether tab switching is currently prevented
   */
  isTabSwitchingPrevented(): boolean;

  /**
   * Saves the current tab to restore later
   */
  saveCurrentTab(): void;

  /**
   * Restores the previously saved tab
   */
  restoreSavedTab(): void;

  /**
   * Cleans up resources and restores original behavior
   */
  destroy(): void;
}

/**
 * URL-based implementation of sidebar tab switching control
 * 
 * This implementation prevents tab switching by intercepting history.pushState
 * calls that change the 'tab' URL query parameter. This works with WME's React
 * Router-based sidebar implementation.
 * 
 * @example
 * ```typescript
 * const controller = new UrlBasedSidebarTabSwitchController();
 * 
 * // Prevent tab switching
 * controller.preventTabSwitching();
 * 
 * // ... perform operations that would normally cause tab switches ...
 * 
 * // Allow tab switching again
 * controller.allowTabSwitching();
 * 
 * // Clean up
 * controller.destroy();
 * ```
 */
export class UrlBasedSidebarTabSwitchController implements ISidebarTabSwitchController {
  private readonly _historyPushStateInterceptor: MethodInterceptor<History, 'pushState'>;
  private _savedTab: string | null = null;

  constructor() {
    this._historyPushStateInterceptor = new MethodInterceptor(
      window.history,
      'pushState',
      interceptBeforeInvocation((state, _, newLocation) => {
        // Convert relative URL to absolute URL for comparison
        const newUrl = new URL(newLocation as string, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Only intercept if it's the same origin and path
        if (!isSameOrigin(newUrl, currentUrl) || !isSamePath(newUrl, currentUrl)) {
          return CONTINUE_INVOCATION;
        }

        // Extract search params from both URLs
        const currentLocationParams = Object.fromEntries(currentUrl.searchParams.entries());
        const newLocationParams = Object.fromEntries(newUrl.searchParams.entries());

        // Check if the tab parameter changed
        const tabChanged = currentLocationParams.tab !== newLocationParams.tab;
        
        // If tab changed, block the navigation regardless of other params
        if (tabChanged) {
          // Return undefined to prevent the pushState from executing
          return undefined;
        }

        // Allow all other navigation
        return CONTINUE_INVOCATION;
      }),
    );
  }

  /**
   * Prevents sidebar tab switching by intercepting history.pushState calls
   * that only change the 'tab' query parameter.
   */
  preventTabSwitching(): void {
    this._historyPushStateInterceptor.enable();
  }

  /**
   * Allows sidebar tab switching by disabling the history.pushState interception.
   */
  allowTabSwitching(): void {
    this._historyPushStateInterceptor.disable();
  }

  /**
   * Returns whether tab switching is currently prevented.
   */
  isTabSwitchingPrevented(): boolean {
    return this._historyPushStateInterceptor.enabled;
  }

  /**
   * Saves the current tab to restore later
   */
  saveCurrentTab(): void {
    const currentUrl = new URL(window.location.href);
    this._savedTab = currentUrl.searchParams.get('tab');
  }

  /**
   * Restores the previously saved tab
   */
  restoreSavedTab(): void {
    if (this._savedTab !== null) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', this._savedTab);
      window.history.pushState(null, '', currentUrl.toString());
      this._savedTab = null;
    }
  }

  /**
   * Cleans up the interceptor and restores original behavior.
   * Should be called when the manager is no longer needed.
   */
  destroy(): void {
    this._historyPushStateInterceptor.restore();
  }
}
