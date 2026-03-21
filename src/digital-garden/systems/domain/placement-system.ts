/**
 * PlacementSystem — handles building/decoration placement, rotation, and deletion.
 *
 * Responsibilities:
 * - Validate footprint availability before placement
 * - Assign stable ids to new instances
 * - Generate roof groups and door instances from blueprint templates
 * - Update MapGridSystem collision overlay on every change
 * - Trigger EconomySystem.spendCopper for placement cost
 * - Notify SaveScheduler via WorldStateSystem
 *
 * PLAN Phase 3 — domain layer
 */

import type { GardenBlueprintDefinition } from '../../types/building-types';
import type { GardenBuildingInstance, GardenDecorationInstance, GardenDoorInstance } from '../../types/building-types';
import type { EconomyTransactionResult } from '../../types/economy-types';
import type { GardenInteriorZoneRecord, GardenRoofGroupRecord } from '../../types/map-types';
import type { EconomySystem } from './economy-system';
import type { MapGridSystem } from './map-grid-system';
import type { WorldStateSystem } from './world-state-system';

export class PlacementSystem {
  constructor(
    private readonly mapGrid: MapGridSystem,
    private readonly worldState: WorldStateSystem,
    private readonly economy: EconomySystem,
  ) {}

  /**
   * Attempt to place a building from a blueprint at (tileX, tileY).
   * Returns 'ok' or an economy/collision error.
   */
  placeBuilding(
    blueprint: GardenBlueprintDefinition,
    tileX: number,
    tileY: number,
    rotation: 0 | 90 | 180 | 270 = 0,
    linkTarget?: string,
  ): EconomyTransactionResult | { ok: false; reason: 'collision' } {
    if (!this.mapGrid.isFootprintFree(tileX, tileY, blueprint.footprint)) {
      return { ok: false, reason: 'collision' };
    }

    const spendResult = this.economy.spendCopper(blueprint.copperCost);
    if (!spendResult.ok) return spendResult;

    const id = `bld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const building: GardenBuildingInstance = {
      id,
      blueprintId: blueprint.id,
      worldId: this.worldState.worldId,
      tileX,
      tileY,
      rotation,
      zOffset: 0,
      state: 'normal',
      enabled: true,
      occupancy: 0,
      maintenanceCost: blueprint.maintenanceCost,
      operationMode: 'running',
      serviceTags: blueprint.serviceTags,
      doorNodeIds: [],
      contentMode: 'none',
      linkTarget,
    };

    // Generate roof group if blueprint has interior
    if (blueprint.roofGroupTemplate) {
      const roofGroup = this.buildRoofGroup(id, blueprint, tileX, tileY);
      this.worldState.objects.roofGroups.push(roofGroup);
      building.roofGroupId = roofGroup.id;

      // Generate interior zone
      const zone = this.buildInteriorZone(id, blueprint, tileX, tileY, roofGroup.id);
      this.worldState.objects.interiorZones.push(zone);
      building.interiorZoneId = zone.id;

      // Update grid cells to reference roof group and zone
      this.patchGridForBuilding(blueprint, tileX, tileY, roofGroup.id, zone.id);
    }

    // Generate doors
    for (const doorOffset of blueprint.doorNodeOffsets) {
      const door = this.buildDoor(id, tileX + doorOffset.dx, tileY + doorOffset.dy, doorOffset.direction, building.interiorZoneId);
      this.worldState.addDoor(door);
      building.doorNodeIds.push(door.id);
    }

    this.worldState.addBuilding(building);
    this.mapGrid.markFootprint(tileX, tileY, blueprint.footprint, true);

    return { ok: true };
  }

  removeBuilding(buildingId: string): void {
    const building = this.worldState.objects.buildings.find(b => b.id === buildingId);
    if (!building) return;

    // Refund 50% of the blueprint cost, with a minimum of 0
    try {
      const title = `$:/plugins/linonetwo/digital-garden/blueprints/${building.blueprintId}`;
      const tiddler = (globalThis as any).$tw?.wiki?.getTiddler(title);
      if (tiddler?.fields?.['copper-cost']) {
        const cost = Number(tiddler.fields['copper-cost']);
        if (!isNaN(cost) && cost > 0) {
          const refund = Math.floor(cost * 0.5);
          this.economy.spendCopper(-refund);
        }
      }
    } catch { /* ignore */ }

    const footprint = this.mapGrid.getBlueprintFootprint(building.blueprintId, building.rotation);
    this.mapGrid.markFootprint(building.tileX, building.tileY, footprint, false);
    this.worldState.removeBuilding(buildingId);
  }

  rotateBuilding(buildingId: string): void {
    const building = this.worldState.objects.buildings.find(b => b.id === buildingId);
    if (!building) return;
    const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
    const nextIndex = (rotations.indexOf(building.rotation) + 1) % 4;
    this.worldState.updateBuilding(buildingId, { rotation: rotations[nextIndex] });
  }

  placeDecoration(
    blueprint: GardenBlueprintDefinition,
    tileX: number,
    tileY: number,
    rotation: 0 | 90 | 180 | 270 = 0,
  ): EconomyTransactionResult | { ok: false; reason: 'collision' } {
    if (!this.mapGrid.isPassable(tileX, tileY)) return { ok: false, reason: 'collision' };
    const spendResult = this.economy.spendCopper(blueprint.copperCost);
    if (!spendResult.ok) return spendResult;

    const id = `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const decoration: GardenDecorationInstance = {
      id,
      blueprintId: blueprint.id,
      worldId: this.worldState.worldId,
      tileX,
      tileY,
      rotation,
      zOffset: 0,
      enabled: true,
    };
    this.worldState.addDecoration(decoration);
    this.mapGrid.markFootprint(tileX, tileY, [{ x: 0, y: 0 }], true);
    return { ok: true };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildRoofGroup(buildingId: string, blueprint: GardenBlueprintDefinition, tileX: number, tileY: number): GardenRoofGroupRecord {
    const template = blueprint.roofGroupTemplate!;
    const zoneId = `zone-${buildingId}`;
    return {
      id: `roof-${buildingId}`,
      buildingId,
      hideWhenInteriorZoneId: zoneId,
      wallOccludeTiles: template.wallOccludeTileOffsets.map(o => ({ x: tileX + o.dx, y: tileY + o.dy })),
    };
  }

  private buildInteriorZone(buildingId: string, blueprint: GardenBlueprintDefinition, tileX: number, tileY: number, _roofGroupId: string): GardenInteriorZoneRecord {
    // Interior tiles = 3×3 area inside the building footprint (simplified)
    const tiles = blueprint.footprint.map(o => ({ x: tileX + o.x, y: tileY + o.y }));
    return {
      id: `zone-${buildingId}`,
      name: blueprint.caption,
      tiles,
      entryDoorIds: [],
      visibleLayersOverride: ['interior'],
    };
  }

  private buildDoor(buildingId: string, tileX: number, tileY: number, direction: string, interiorZoneId?: string): GardenDoorInstance {
    return {
      id: `door-${buildingId}-${direction}`,
      buildingId,
      tileX,
      tileY,
      direction: direction as GardenDoorInstance['direction'],
      connectsInteriorZoneId: interiorZoneId ?? '',
      passable: true,
    };
  }

  private patchGridForBuilding(blueprint: GardenBlueprintDefinition, tileX: number, tileY: number, roofGroupId: string, zoneId: string): void {
    const { cells } = this.worldState.grid;
    for (const offset of blueprint.footprint) {
      const cy = tileY + offset.y;
      const cx = tileX + offset.x;
      if (cells[cy]?.[cx]) {
        cells[cy][cx].roofGroupId = roofGroupId;
        cells[cy][cx].zoneId = zoneId;
      }
    }
  }
}
