/* eslint-disable unicorn/prevent-abbreviations, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports */
const { BuildingOperationSystem } = require('$:/plugins/linonetwo/digital-garden/systems/domain/building-operation-system.js');

describe('BuildingOperationSystem', function() {
  it('should toggle building operation mode', function() {
    const mockWorldState = {
      isLoaded: true,
      state: { buildingOperationStates: {} },
      objects: { buildings: [] },
      setBuildingOperationMode: function(id, mode) {
        this.state.buildingOperationStates[id] = mode;
      }
    };
    
    // Add fake dependency objects
    const fakeEconomy = {};
    const fakeScheduler = {};
    
    const ops = new BuildingOperationSystem(mockWorldState, fakeEconomy, fakeScheduler);
    
    // Default is running
    expect(ops.isRunning('test-1')).toBe(true);
    
    // Toggle switches to paused
    ops.toggleOperation('test-1');
    expect(mockWorldState.state.buildingOperationStates['test-1']).toBe('paused');
    expect(ops.isRunning('test-1')).toBe(false);
    
    // Toggle again returns to running
    ops.toggleOperation('test-1');
    expect(mockWorldState.state.buildingOperationStates['test-1']).toBe('running');
    expect(ops.isRunning('test-1')).toBe(true);
  });
});