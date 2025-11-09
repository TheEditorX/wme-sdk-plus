import { SelectionModeManager } from './selection-mode-manager.js';
import { SelectionModeOptions } from './types.js';
import { ISidebarTabSwitchController } from '@wme-enhanced-sdk/module-ui--sidebar-manager';

// Mock SDK
const createMockSdk = () => ({
  Editing: {
    setSelection: vi.fn(),
    getSelection: vi.fn(),
    clearSelection: vi.fn(),
  },
});

// Mock sidebar controller
const createMockSidebarController = (): ISidebarTabSwitchController => ({
  preventTabSwitching: vi.fn(),
  allowTabSwitching: vi.fn(),
  isTabSwitchingPrevented: vi.fn(() => false),
  destroy: vi.fn(),
});

describe('SelectionModeManager', () => {
  let manager: SelectionModeManager;
  let mockSdk: ReturnType<typeof createMockSdk>;
  let mockSidebarController: ISidebarTabSwitchController;

  beforeEach(() => {
    mockSidebarController = createMockSidebarController();
    manager = new SelectionModeManager(mockSidebarController);
    mockSdk = createMockSdk();
  });

  describe('enterSelectionMode', () => {
    it('should enter selection mode with basic options', () => {
      const options: SelectionModeOptions = {
        filter: {
          types: ['segment'],
        },
      };

      expect(manager.isInSelectionMode()).toBe(false);
      
      const result = manager.enterSelectionMode(mockSdk as any, options);
      
      expect(manager.isInSelectionMode()).toBe(true);
      expect(result).toHaveProperty('exit');
      expect(result).toHaveProperty('getFilter');
      expect(result).toHaveProperty('updateFilter');
    });

    it('should prevent tab switching by default', () => {
      const options: SelectionModeOptions = {
        filter: {
          types: ['segment'],
        },
      };

      manager.enterSelectionMode(mockSdk as any, options);
      
      expect(mockSidebarController.preventTabSwitching).toHaveBeenCalled();
    });

    it('should not prevent tab switching when preventTabSwitching is false', () => {
      const options: SelectionModeOptions = {
        filter: {
          types: ['segment'],
        },
        preventTabSwitching: false,
      };

      manager.enterSelectionMode(mockSdk as any, options);
      
      expect(mockSidebarController.preventTabSwitching).not.toHaveBeenCalled();
    });

    it('should throw error if already in selection mode', () => {
      const options: SelectionModeOptions = {
        filter: {
          types: ['segment'],
        },
      };

      manager.enterSelectionMode(mockSdk as any, options);
      
      expect(() => {
        manager.enterSelectionMode(mockSdk as any, options);
      }).toThrow('Already in selection mode');
    });

    it('should call onSelect callback when provided', () => {
      const onSelect = vi.fn();
      const options: SelectionModeOptions = {
        filter: {
          types: ['segment'],
        },
        onSelect,
      };

      manager.enterSelectionMode(mockSdk as any, options);
      
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('isInSelectionMode', () => {
    it('should return false initially', () => {
      expect(manager.isInSelectionMode()).toBe(false);
    });

    it('should return true after entering selection mode', () => {
      const options: SelectionModeOptions = {
        filter: {
          types: ['segment'],
        },
      };

      manager.enterSelectionMode(mockSdk as any, options);
      
      expect(manager.isInSelectionMode()).toBe(true);
    });

    it('should return false after exiting selection mode', () => {
      const options: SelectionModeOptions = {
        filter: {
          types: ['segment'],
        },
      };

      const result = manager.enterSelectionMode(mockSdk as any, options);
      result.exit();
      
      expect(manager.isInSelectionMode()).toBe(false);
    });
  });

  describe('SelectionModeResult', () => {
    it('should exit selection mode when exit is called', () => {
      const options: SelectionModeOptions = {
        filter: {
          types: ['segment'],
        },
      };

      const result = manager.enterSelectionMode(mockSdk as any, options);
      
      expect(manager.isInSelectionMode()).toBe(true);
      
      result.exit();
      
      expect(manager.isInSelectionMode()).toBe(false);
      expect(mockSidebarController.allowTabSwitching).toHaveBeenCalled();
    });

    it('should return current filter when getFilter is called', () => {
      const options: SelectionModeOptions = {
        filter: {
          types: ['segment', 'venue'],
          allowedIds: [1, 2, 3],
        },
      };

      const result = manager.enterSelectionMode(mockSdk as any, options);
      const filter = result.getFilter();
      
      expect(filter.types).toEqual(['segment', 'venue']);
      expect(filter.allowedIds).toEqual([1, 2, 3]);
    });

    it('should update filter when updateFilter is called', () => {
      const options: SelectionModeOptions = {
        filter: {
          types: ['segment'],
        },
      };

      const result = manager.enterSelectionMode(mockSdk as any, options);
      
      result.updateFilter({
        types: ['venue'],
        allowedIds: [10, 20],
      });
      
      const filter = result.getFilter();
      expect(filter.types).toEqual(['venue']);
      expect(filter.allowedIds).toEqual([10, 20]);
    });
  });

  describe('onCancel callback', () => {
    it('should not call onCancel when exit is called normally', () => {
      const onCancel = vi.fn();
      const options: SelectionModeOptions = {
        filter: {
          types: ['segment'],
        },
        onCancel,
      };

      const result = manager.enterSelectionMode(mockSdk as any, options);
      result.exit();
      
      expect(onCancel).not.toHaveBeenCalled();
    });
  });
});
