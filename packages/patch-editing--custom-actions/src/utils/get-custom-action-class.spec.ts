import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getCustomActionClass } from './get-custom-action-class.js';
import { CustomActionPayload } from '../types/index.js';

// Define base mock classes matching WME's expected class hierarchy
class MockAction {
  static isMock = true;
  _description = '';
  generateDescription() { }
}
class MockCompositeAction extends MockAction { }
class MockMultiAction extends MockCompositeAction { }

// Mock window and repository structures
const mockRepository = {
  getObjectById: vi.fn(),
};

const mockW = {
  model: {
    getRepository: vi.fn().mockReturnValue(mockRepository),
  },
};

const mockWindow = {
  require: vi.fn().mockImplementation((module) => {
    if (module === 'Waze/Action/MultiAction') {
      return MockMultiAction;
    }
    throw new Error(`Module ${module} not found`);
  }),
  W: mockW,
};

vi.mock('@wme-enhanced-sdk/utils', () => ({
  getWindow: () => mockWindow,
}));

describe('getCustomActionClass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully traverse prototype chain and construct CustomSdkAction', () => {
    const CustomActionClass = getCustomActionClass();
    expect(CustomActionClass).toBeDefined();

    // Verify it extends MockAction via the prototype chain
    expect(CustomActionClass.prototype instanceof MockAction).toBe(true);

    const payload: CustomActionPayload = {
      description: 'Test Custom Action',
      affectedObjects: [],
      do: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
    };

    const actionInstance = new CustomActionClass(payload);
    expect(actionInstance).toBeDefined();
    expect((actionInstance as any).shouldSerialize).toBe(false);
    expect((actionInstance as any).actionName).toBe('CUSTOM_SDK_ACTION');
    expect(actionInstance._description).toBe('Test Custom Action');
  });

  it('should invoke do, undo, and redo closures correctly', () => {
    const CustomActionClass = getCustomActionClass();
    const doMock = vi.fn();
    const undoMock = vi.fn();
    const redoMock = vi.fn();

    const payload: CustomActionPayload = {
      description: 'Test Closures',
      affectedObjects: [],
      do: doMock,
      undo: undoMock,
      redo: redoMock,
    };

    const actionInstance = new CustomActionClass(payload);

    actionInstance.doAction(mockW.model);
    expect(doMock).toHaveBeenCalledTimes(1);

    actionInstance.undoAction!(mockW.model);
    expect(undoMock).toHaveBeenCalledTimes(1);

    actionInstance.redoAction!(mockW.model);
    expect(redoMock).toHaveBeenCalledTimes(1);
  });

  it('should fallback to do closure if redo is not provided', () => {
    const CustomActionClass = getCustomActionClass();
    const doMock = vi.fn();
    const undoMock = vi.fn();

    const payload: CustomActionPayload = {
      description: 'Test Fallback',
      affectedObjects: [],
      do: doMock,
      undo: undoMock,
    };

    const actionInstance = new CustomActionClass(payload);

    actionInstance.redoAction!(mockW.model);
    expect(doMock).toHaveBeenCalledTimes(1);
  });

  it('should map affectedObjects to live WME objects and extract unique IDs', () => {
    const CustomActionClass = getCustomActionClass();
    const liveObject1 = { getUniqueID: () => 'id_1' };
    const liveObject2 = { getUniqueID: () => 'id_2' };

    // Set up mock repository reactions
    mockRepository.getObjectById.mockImplementation((id) => {
      if (id === 'segment_1') return liveObject1;
      if (id === 'node_2') return liveObject2;
      return null;
    });

    const payload: CustomActionPayload = {
      description: 'Test Mapping',
      affectedObjects: [
        { objectType: 'segment', objectId: 'segment_1' },
        { objectType: 'node', objectId: 'node_2' },
        { objectType: 'venue', objectId: 'non_existent' },
      ],
      do: vi.fn(),
      undo: vi.fn(),
    };

    const actionInstance = new CustomActionClass(payload);

    const focusFeatures = actionInstance.getFocusFeatures(mockW.model);
    expect(focusFeatures).toEqual([liveObject1, liveObject2]);
    expect(mockW.model.getRepository).toHaveBeenCalledWith('segment');
    expect(mockW.model.getRepository).toHaveBeenCalledWith('node');
    expect(mockW.model.getRepository).toHaveBeenCalledWith('venue');

    const affectedUniqueIds = actionInstance.getAffectedUniqueIds(mockW.model);
    expect(affectedUniqueIds).toEqual(['id_1', 'id_2']);
  });

  it('should support custom actionName from payload', () => {
    const CustomActionClass = getCustomActionClass();
    const payload: CustomActionPayload = {
      actionName: 'OVERRIDDEN_ACTION_NAME',
      description: 'Custom Name Action',
      affectedObjects: [],
      do: vi.fn(),
    };

    const actionInstance = new CustomActionClass(payload);
    expect((actionInstance as any).actionName).toBe('OVERRIDDEN_ACTION_NAME');
  });

  it('should handle optional undo closure gracefully when not provided and report undoSupported accordingly', () => {
    const CustomActionClass = getCustomActionClass();
    const payload: CustomActionPayload = {
      description: 'No Undo Action',
      affectedObjects: [],
      do: vi.fn(),
    };

    const actionInstance = new CustomActionClass(payload);
    expect(actionInstance.undoSupported()).toBe(false);

    const payloadWithUndo: CustomActionPayload = {
      description: 'With Undo Action',
      affectedObjects: [],
      do: vi.fn(),
      undo: vi.fn(),
    };
    const actionInstanceWithUndo = new CustomActionClass(payloadWithUndo);
    expect(actionInstanceWithUndo.undoSupported()).toBe(true);
  });

  it('should resolve and cache objects on accept call and reuse them', () => {
    const CustomActionClass = getCustomActionClass();
    const liveObject1 = { getUniqueID: () => 'id_1' };

    mockRepository.getObjectById.mockReturnValue(liveObject1);

    const payload: CustomActionPayload = {
      description: 'Caching Action',
      affectedObjects: [{ objectType: 'segment', objectId: 'segment_1' }],
      do: vi.fn(),
    };

    const actionInstance = new CustomActionClass(payload);

    // Call accept() to trigger caching
    mockW.model.getRepository.mockClear();
    actionInstance.accept(mockW.model);

    // Repository should be called during accept
    expect(mockW.model.getRepository).toHaveBeenCalledTimes(1);

    // subsequent calls should be cached (O(1))
    mockW.model.getRepository.mockClear();
    const focusFeatures = actionInstance.getFocusFeatures(mockW.model);
    expect(focusFeatures).toEqual([liveObject1]);
    expect(mockW.model.getRepository).not.toHaveBeenCalled();

    const affectedUniqueIds = actionInstance.getAffectedUniqueIds(mockW.model);
    expect(affectedUniqueIds).toEqual(['id_1']);
    expect(mockW.model.getRepository).not.toHaveBeenCalled();
  });
});
