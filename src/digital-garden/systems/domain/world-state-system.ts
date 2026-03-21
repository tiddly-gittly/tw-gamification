/**
 * WorldStateSystem — aggregates and caches the currently loaded world's data.
 *
 * Holds the authoritative in-memory copy of:
 *   - world meta
 *   - world grid
 *   - world objects (buildings, decorations, doors, roof groups, interior zones, residents)
 *   - world transient state (camera, player position, operation states, active zone)
 *
 * All domain systems read world data through this system,
 * and schedule writes through SaveScheduler.
 *
 * PLAN Phase 2 — domain layer
 */

import type { GardenBuildingInstance, GardenDecorationInstance, GardenDoorInstance } from '../../types/building-types';
import type { GardenWorldGridData } from '../../types/map-types';
import type { GardenResidentState, GardenWorldObjectRecord } from '../../types/resident-types';
import type { GardenWorldMeta, GardenWorldState } from '../../types/world-types';
import type { SaveScheduler } from '../infra/save-scheduler';
import type { TiddlerRepository } from '../infra/tiddler-repository';

export class WorldStateSystem {
  private _meta: GardenWorldMeta | undefined;
  private _grid: GardenWorldGridData | undefined;
  private _objects: GardenWorldObjectRecord | undefined;
  private _state: GardenWorldState | undefined;
  private _worldId: string | undefined;

  constructor(
    private readonly repo: TiddlerRepository,
    private readonly scheduler: SaveScheduler,
  ) {}

  /** Load all data for a world into memory. Must be called before any reads. */
  loadWorld(worldId: string): void {
    this._worldId = worldId;
    this._meta = this.repo.readWorldMeta(worldId);
    this._grid = this.repo.readWorldGrid(worldId);
    this._objects = this.repo.readWorldObjects(worldId) ?? { buildings: [], decorations: [], doors: [], roofGroups: [], interiorZones: [], residents: [] };
    this._state = this.repo.readWorldState(worldId) ?? this.defaultState(worldId);
  }

  unloadWorld(): void {
    this._worldId = undefined;
    this._meta = undefined;
    this._grid = undefined;
    this._objects = undefined;
    this._state = undefined;
  }

  get isLoaded(): boolean {
    return this._worldId !== undefined;
  }
  get worldId(): string {
    return this._worldId ?? '';
  }
  get meta(): GardenWorldMeta {
    return this._meta!;
  }
  get grid(): GardenWorldGridData {
    return this._grid!;
  }
  get objects(): GardenWorldObjectRecord {
    return this._objects!;
  }
  get state(): GardenWorldState {
    return this._state!;
  }

  // ─── Buildings ────────────────────────────────────────────────────────────

  addBuilding(building: GardenBuildingInstance): void {
    this._objects!.buildings.push(building);
    this.scheduler.scheduleWorldObjects(this._worldId!, this._objects!, 'soon');
  }

  removeBuilding(buildingId: string): void {
    this._objects!.buildings = this._objects!.buildings.filter(b => b.id !== buildingId);
    this.scheduler.scheduleWorldObjects(this._worldId!, this._objects!, 'soon');
  }

  updateBuilding(buildingId: string, patch: Partial<GardenBuildingInstance>): void {
    const index = this._objects!.buildings.findIndex(b => b.id === buildingId);
    if (index >= 0) {
      this._objects!.buildings[index] = { ...this._objects!.buildings[index], ...patch };
      this.scheduler.scheduleWorldObjects(this._worldId!, this._objects!, 'soon');
    }
  }

  // ─── Decorations ──────────────────────────────────────────────────────────

  addDecoration(decoration: GardenDecorationInstance): void {
    this._objects!.decorations.push(decoration);
    this.scheduler.scheduleWorldObjects(this._worldId!, this._objects!, 'soon');
  }

  removeDecoration(decorationId: string): void {
    this._objects!.decorations = this._objects!.decorations.filter(d => d.id !== decorationId);
    this.scheduler.scheduleWorldObjects(this._worldId!, this._objects!, 'soon');
  }

  // ─── Doors ────────────────────────────────────────────────────────────────

  addDoor(door: GardenDoorInstance): void {
    this._objects!.doors.push(door);
    this.scheduler.scheduleWorldObjects(this._worldId!, this._objects!, 'soon');
  }

  // ─── Residents ────────────────────────────────────────────────────────────

  updateResidentState(residentId: string, patch: Partial<GardenResidentState>): void {
    const index = this._objects!.residents.findIndex(r => r.id === residentId);
    if (index >= 0) {
      this._objects!.residents[index] = { ...this._objects!.residents[index], ...patch, lastUpdated: Date.now() };
      // Residents are low-frequency — schedule as lazy
      this.scheduler.scheduleWorldObjects(this._worldId!, this._objects!, 'lazy');
    }
  }

  // ─── Transient state ──────────────────────────────────────────────────────

  updateCamera(x: number, y: number, zoom: number): void {
    this._state!.camera = { x, y, zoom };
    this.scheduler.scheduleWorldState(this._worldId!, this._state!, 'lazy');
  }

  updatePlayerPosition(tileX: number, tileY: number, direction: GardenWorldState['playerDirection']): void {
    this._state!.playerTileX = tileX;
    this._state!.playerTileY = tileY;
    this._state!.playerDirection = direction;
    this.scheduler.scheduleWorldState(this._worldId!, this._state!, 'lazy');
  }

  setActiveInteriorZone(zoneId: string | undefined): void {
    this._state!.activeInteriorZoneId = zoneId;
    this.scheduler.scheduleWorldState(this._worldId!, this._state!, 'soon');
  }

  setBuildingOperationMode(buildingId: string, mode: 'running' | 'paused'): void {
    this._state!.buildingOperationStates[buildingId] = mode;
    this.scheduler.scheduleWorldState(this._worldId!, this._state!, 'soon');
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private defaultState(worldId: string): GardenWorldState {
    return {
      worldId,
      camera: { x: 0, y: 0, zoom: 1 },
      playerTileX: 8,
      playerTileY: 8,
      playerDirection: 'south',
      selectedBuildingId: undefined,
      activeInteriorZoneId: undefined,
      buildingOperationStates: {},
    };
  }
}
