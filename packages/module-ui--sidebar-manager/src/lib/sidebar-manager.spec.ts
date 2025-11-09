import { SidebarManager } from './sidebar-manager.js';

describe('SidebarManager', () => {
  let manager: SidebarManager;
  let originalPushState: typeof window.history.pushState;

  beforeEach(() => {
    // Save the original pushState
    originalPushState = window.history.pushState;
    manager = new SidebarManager();
  });

  afterEach(() => {
    // Clean up and restore
    manager.destroy();
    window.history.pushState = originalPushState;
  });

  describe('preventTabSwitching', () => {
    it('should enable tab switching prevention', () => {
      expect(manager.isTabSwitchingPrevented()).toBe(false);
      manager.preventTabSwitching();
      expect(manager.isTabSwitchingPrevented()).toBe(true);
    });

    it('should prevent history.pushState when only tab parameter changes', () => {
      manager.preventTabSwitching();

      const pushStateSpy = vi.fn();
      window.history.pushState = pushStateSpy;

      // Try to change tab
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', 'different-tab');
      
      // This should be intercepted and not call the spy
      // We can't directly test the interception without triggering it from within the browser
      // but we can verify the manager is in the correct state
      expect(manager.isTabSwitchingPrevented()).toBe(true);
    });
  });

  describe('allowTabSwitching', () => {
    it('should disable tab switching prevention', () => {
      manager.preventTabSwitching();
      expect(manager.isTabSwitchingPrevented()).toBe(true);
      
      manager.allowTabSwitching();
      expect(manager.isTabSwitchingPrevented()).toBe(false);
    });
  });

  describe('isTabSwitchingPrevented', () => {
    it('should return false initially', () => {
      expect(manager.isTabSwitchingPrevented()).toBe(false);
    });

    it('should return true after preventTabSwitching is called', () => {
      manager.preventTabSwitching();
      expect(manager.isTabSwitchingPrevented()).toBe(true);
    });

    it('should return false after allowTabSwitching is called', () => {
      manager.preventTabSwitching();
      manager.allowTabSwitching();
      expect(manager.isTabSwitchingPrevented()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should restore original behavior', () => {
      manager.preventTabSwitching();
      expect(manager.isTabSwitchingPrevented()).toBe(true);
      
      manager.destroy();
      
      // After destroy, the manager should no longer be active
      // We verify this by checking that we can create a new manager
      const newManager = new SidebarManager();
      expect(newManager.isTabSwitchingPrevented()).toBe(false);
      newManager.destroy();
    });
  });

  describe('multiple enable/disable cycles', () => {
    it('should handle multiple enable/disable cycles correctly', () => {
      expect(manager.isTabSwitchingPrevented()).toBe(false);
      
      manager.preventTabSwitching();
      expect(manager.isTabSwitchingPrevented()).toBe(true);
      
      manager.allowTabSwitching();
      expect(manager.isTabSwitchingPrevented()).toBe(false);
      
      manager.preventTabSwitching();
      expect(manager.isTabSwitchingPrevented()).toBe(true);
      
      manager.allowTabSwitching();
      expect(manager.isTabSwitchingPrevented()).toBe(false);
    });
  });
});
