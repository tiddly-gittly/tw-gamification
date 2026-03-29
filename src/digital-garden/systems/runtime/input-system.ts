/**
 * InputSystem — handles pointer events, keyboard shortcuts, and DOM UI binding.
 *
 * Interactions:
 *   Left-drag → pan camera (drag threshold = 5px)
 *   Left-click (move tool) → move lord to tile
 *   Left-click (place tool) → confirm placement
 *   Right-click / Escape → cancel placement
 *   Scroll wheel / pinch → zoom
 *   Toolbar buttons → switch tool
 *   Blueprint drawer items → enter placement mode
 *   Keyboard 1/2/3 → quick placement, R → rotate, Esc → cancel
 *
 * PLAN Phase 3 — runtime layer
 */

import type { Application } from '$:/plugins/linonetwo/pixijs/pixi.js';
import type { GardenBlueprintDefinition } from '../../types/building-types';
import type { EconomySystem } from '../domain/economy-system';
import type { MapGridSystem } from '../domain/map-grid-system';
import type { PlacementSystem } from '../domain/placement-system';
import type { PlayerSystem } from '../domain/player-system';
import type { WorldStateSystem } from '../domain/world-state-system';
import type { CameraSystem } from './camera-system';
import type { ActiveTool, UiStateSystem } from './ui-state-system';

const DRAG_THRESHOLD = 5; // pixels — distinguishes click from drag

import type { BuildingOperationSystem } from '../domain/building-operation-system';
import type { AudioSystem } from './audio-system';

export class InputSystem {
  private isDragging = false;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private hasMoved = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly onPointerDownBound: (event: PointerEvent) => void;
  private readonly onPointerMoveBound: (event: PointerEvent) => void;
  private readonly onPointerUpBound: (event: PointerEvent) => void;
  private readonly onWheelBound: (event: WheelEvent) => void;
  private readonly onKeyDownBound: (event: KeyboardEvent) => void;
  private readonly onContextMenuBound: (event: MouseEvent) => void;

  /** Reference to the root .dg-root element for DOM UI binding */
  private dgRoot: HTMLElement | undefined;

  constructor(
    private readonly pixiApp: Application,
    private readonly camera: CameraSystem,
    private readonly mapGrid: MapGridSystem,
    private readonly player: PlayerSystem,
    private readonly placement: PlacementSystem,
    private readonly ui: UiStateSystem,
    private readonly getBlueprintById: (id: string) => GardenBlueprintDefinition | undefined,
    private readonly economy: EconomySystem,
    private readonly buildingOps: BuildingOperationSystem,
    private readonly worldState: WorldStateSystem,
    private readonly audio: AudioSystem,
    private readonly requestRecharge: (kind: 'SmallReward' | 'LargeReward', amount: number) => void
  ) {
    this.canvas = this.pixiApp.canvas;
    this.onPointerDownBound = this.onPointerDown.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound = this.onPointerUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onContextMenuBound = event => {
      event.preventDefault();
    };

    this.canvas.addEventListener('pointerdown', this.onPointerDownBound);
    this.canvas.addEventListener('pointermove', this.onPointerMoveBound);
    this.canvas.addEventListener('pointerup', this.onPointerUpBound);
    this.canvas.addEventListener('wheel', this.onWheelBound, { passive: false });
    this.canvas.addEventListener('contextmenu', this.onContextMenuBound);
    // Scope keydown to canvas container instead of window to avoid TW conflicts
    this.canvas.tabIndex = 0;
    this.canvas.style.outline = 'none';
    this.canvas.addEventListener('keydown', this.onKeyDownBound);

    // Bind UI listeners after a microtask (DOM may not be ready yet)
    queueMicrotask(() => {
      this.bindDomUi();
    });

    // Subscribe to UiState changes to sync DOM
    this.ui.onUiChange(() => {
      this.syncDomState();
    });
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDownBound);
    this.canvas.removeEventListener('pointermove', this.onPointerMoveBound);
    this.canvas.removeEventListener('pointerup', this.onPointerUpBound);
    this.canvas.removeEventListener('wheel', this.onWheelBound);
    this.canvas.removeEventListener('contextmenu', this.onContextMenuBound);
    this.canvas.removeEventListener('keydown', this.onKeyDownBound);
  }

  // ─── DOM UI binding ───────────────────────────────────────────────────────

  private bindDomUi(): void {
    this.dgRoot = this.canvas.closest('.dg-root') as HTMLElement | undefined ?? document.querySelector('.dg-root') as HTMLElement | undefined;
    if (!this.dgRoot) return;

    const rechargeOverlay = this.dgRoot.querySelector<HTMLElement>('#dg-recharge-overlay');
    const rechargeOpenButton = this.dgRoot.querySelector<HTMLButtonElement>('#dg-recharge-open-btn');
    const rechargeCloseButton = this.dgRoot.querySelector<HTMLButtonElement>('#dg-recharge-close-btn');
    const rechargeModalBox = this.dgRoot.querySelector<HTMLElement>('.dg-modal-box');
    const rechargeTypeSelect = this.dgRoot.querySelector<HTMLSelectElement>('#dg-recharge-type-select');
    const rechargeConfirmBtn = this.dgRoot.querySelector<HTMLButtonElement>('#dg-recharge-confirm-btn');
    const rechargeAmountInput = this.dgRoot.querySelector<HTMLInputElement>('#dg-recharge-amount-input');
    const rechargeStatus = this.dgRoot.querySelector<HTMLElement>('#dg-recharge-status');

    if (rechargeConfirmBtn && rechargeAmountInput && rechargeTypeSelect && rechargeStatus) {
      rechargeConfirmBtn.addEventListener('click', () => {
        const amount = parseInt(rechargeAmountInput.value, 10);
        const kind = rechargeTypeSelect.value === 'LargeReward' ? 'LargeReward' : 'SmallReward';
        if (!isNaN(amount) && amount > 0) {
          rechargeStatus.innerText = '正在充值...';
          this.requestRecharge(kind, amount);
          setTimeout(() => {
            rechargeStatus.innerText = `已请求充值 ${kind === 'LargeReward' ? '大奖励' : '小奖励'} × ${amount}`;
            this.audio.playBuySuccess();
          }, 300);
        }
      });
    }

    if (rechargeOpenButton && rechargeOverlay) {
      rechargeOpenButton.addEventListener('click', () => {
        rechargeOverlay.style.display = 'flex';
        // 计算当前可用的大小奖励数量
        let smallCount = 0;
        let largeCount = 0;
        try {
          const titles = (globalThis as any).$tw.wiki.getTiddlersWithTag('$:/Tags/Gamification/RealityEventCache');
          for (const title of titles) {
            const tempTid = (globalThis as any).$tw.wiki.getTiddler(title);
            if (!tempTid || !tempTid.fields.text) continue;
            const items = JSON.parse(tempTid.fields.text);
            for (const item of items) {
              if (item?.event?.type === 'SmallReward') smallCount += 1;
              if (item?.event?.type === 'LargeReward') largeCount += 1;
            }
          }
        } catch { /* ignore */ }
        
        const infoEl = this.dgRoot?.querySelector<HTMLElement>('#dg-recharge-available-info');
        if (infoEl) {
          infoEl.innerHTML = `当前可用：<strong style="color:#d88c42;">${smallCount} 个小奖励</strong>，<strong style="color:#f2c037;">${largeCount} 个大奖励</strong>`;
        }
      });
    }
    if (rechargeCloseButton && rechargeOverlay) {
      rechargeCloseButton.addEventListener('click', () => {
        rechargeOverlay.style.display = 'none';
      });
    }
    if (rechargeOverlay) {
      rechargeOverlay.addEventListener('click', () => {
        rechargeOverlay.style.display = 'none';
      });
    }
    if (rechargeModalBox) {
      rechargeModalBox.addEventListener('click', event => {
        event.stopPropagation();
      });
    }

    // Tool buttons
    for (const button of Array.from(this.dgRoot.querySelectorAll<HTMLButtonElement>('.dg-tool-btn'))) {
      button.addEventListener('click', () => {
        const tool = button.dataset.tool as ActiveTool | undefined;
        if (tool) {
          this.ui.setTool(tool);
          this.canvas.focus();
        }
      });
    }

    // Blueprint drawer items
    for (const item of Array.from(this.dgRoot.querySelectorAll<HTMLElement>('.dg-bp-item'))) {
      item.addEventListener('click', () => {
        const bpId = item.dataset.blueprint;
        if (!bpId) return;
        const bp = this.getBlueprintById(bpId);
        if (bp) {
          this.ui.startPlacement(bp);
          this.canvas.focus();
        }
      });
    }

    // Building Panel
    const closeButton = this.dgRoot.querySelector<HTMLButtonElement>('#dg-bp-close-btn');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.ui.selectBuilding(undefined);
      });
    }

    const toggleButton = this.dgRoot.querySelector<HTMLButtonElement>('#dg-bp-toggle-btn');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        const id = this.ui.selectedBuildingId;
        if (id) {
          this.buildingOps.toggleOperation(id);
          this.syncDomState();
        }
      });
    }

    this.syncDomState();
  }

  /** Sync DOM UI to reflect current UiStateSystem */
  syncDomState(): void {
    if (!this.dgRoot) return;

    // Tool buttons
    for (const button of Array.from(this.dgRoot.querySelectorAll<HTMLButtonElement>('.dg-tool-btn'))) {
      button.classList.toggle('dg-tool-active', button.dataset.tool === this.ui.activeTool);
    }

    // Blueprint drawer visibility
    const drawer = this.dgRoot.querySelector<HTMLElement>('#dg-blueprint-drawer');
    if (drawer) {
      drawer.style.display = this.ui.activeTool === 'place' ? 'flex' : 'none';
    }

    // Blueprint active state
    for (const item of Array.from(this.dgRoot.querySelectorAll<HTMLElement>('.dg-bp-active'))) {
      item.classList.remove('dg-bp-active');
    }
    if (this.ui.placementGhost) {
      const activeItem = this.dgRoot.querySelector<HTMLElement>(`.dg-bp-item[data-blueprint="${this.ui.placementGhost.blueprint.id}"]`);
      if (activeItem) activeItem.classList.add('dg-bp-active');
    }

    // Building Panel visibility
    const panel = this.dgRoot.querySelector<HTMLElement>('#dg-building-panel');
    if (panel) {
      if (this.ui.detailsPanelOpen && this.ui.selectedBuildingId && this.worldState.isLoaded) {
        panel.style.display = 'flex';
        const building = this.worldState.objects.buildings.find(b => b.id === this.ui.selectedBuildingId);
        const bp = building ? this.getBlueprintById(building.blueprintId) : undefined;

        const titleElement = panel.querySelector<HTMLElement>('#dg-bp-title');
        if (titleElement) titleElement.textContent = bp?.caption ?? '未知建筑';

        const statusElement = panel.querySelector<HTMLElement>('#dg-bp-status');
        const toggleButton = panel.querySelector<HTMLElement>('#dg-bp-toggle-btn');
        if (statusElement && toggleButton && building) {
          const isRunning = this.buildingOps.isRunning(building.id);
          statusElement.textContent = isRunning ? '运营中 🟢' : '已暂停 🔴';
          toggleButton.textContent = isRunning ? '暂停运营' : '恢复运营';
        }
      } else {
        panel.style.display = 'none';
      }
    }

    // Status bar
    const statusTool = this.dgRoot.querySelector<HTMLElement>('#dg-status-tool');
    const statusHint = this.dgRoot.querySelector<HTMLElement>('#dg-status-hint');
    if (statusTool && statusHint) {
      switch (this.ui.activeTool) {
        case 'move':
          statusTool.textContent = '🚶 移动模式';
          statusHint.textContent = '左键拖拽平移 · 滚轮缩放 · 点击空地移动城主';
          break;
        case 'place':
          statusTool.textContent = '🔨 放置模式';
          statusHint.textContent = this.ui.placementGhost
            ? `正在放置: ${this.ui.placementGhost.blueprint.caption} · 左键确认 · 右键/Esc取消 · R旋转`
            : '请从上方选择建筑蓝图';
          break;
        case 'select':
          statusTool.textContent = '🔍 查看模式';
          statusHint.textContent = '点击建筑查看详情';
          break;
        case 'delete':
          statusTool.textContent = '🗑️ 删除模式';
          statusHint.textContent = '点击建筑删除';
          break;
      }
    }
  }

  /** Update HUD coins display */
  updateHud(copper: number, gold: number, silver: number): void {
    if (!this.dgRoot) return;
    const setValue = (id: string, value: number) => {
      const element = this.dgRoot!.querySelector<HTMLElement>(`#${id}`);
      if (element) element.textContent = String(value);
    };
    setValue('dg-copper-val', copper);
    setValue('dg-gold-val', gold);
    setValue('dg-silver-val', silver);
  }

  /** Show a transient feedback message in the status bar */
  showFeedback(message: string, durationMs = 2500): void {
    if (!this.dgRoot) return;
    const element = this.dgRoot.querySelector<HTMLElement>('#dg-status-feedback');
    if (!element) return;
    element.textContent = message;
    element.style.opacity = '1';
    setTimeout(() => {
      element.style.opacity = '0';
    }, durationMs);
  }

  // ─── Pointer event handlers ───────────────────────────────────────────────

  private onPointerDown(event: PointerEvent): void {
    // Right click: cancel placement or context menu
    if (event.button === 2) {
      if (this.ui.activeTool === 'place') {
        this.ui.cancelPlacement();
      }
      return;
    }

    // Left or middle button: start potential drag
    if (event.button === 0 || event.button === 1) {
      this.pointerDownX = event.clientX;
      this.pointerDownY = event.clientY;
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
      this.hasMoved = false;
      this.isDragging = false;
      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch { /* ignore setPointerCapture error */ }
    }
  }

  private onPointerMove(event: PointerEvent): void {
    // Check if we should start dragging
    if (!this.isDragging && (event.buttons & 1 || event.buttons & 4)) {
      const dx = event.clientX - this.pointerDownX;
      const dy = event.clientY - this.pointerDownY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        this.isDragging = true;
        this.hasMoved = true;
      }
    }

    if (this.isDragging) {
      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;
      this.camera.pan(dx, dy);
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
      return;
    }

    // Ghost follow cursor in placement mode
    if (this.ui.activeTool === 'place' && this.ui.placementGhost) {
      const tile = this.pointerToTile(event);
      if (!tile || !this.mapGrid.isInBounds(tile.tileX, tile.tileY)) return;
      const valid = this.mapGrid.isFootprintFree(tile.tileX, tile.tileY, this.ui.placementGhost.blueprint.footprint);
      this.ui.updateGhostPosition(tile.tileX, tile.tileY, valid);
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      return;
    }

    // Only process click if no drag occurred
    if (!this.hasMoved && event.button === 0) {
      this.handlePrimaryClick(event);
    }
    this.isDragging = false;
    this.hasMoved = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.canvas.getBoundingClientRect();
    this.camera.zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top);
  }

  private handlePrimaryClick(event: PointerEvent): void {
    const tile = this.pointerToTile(event);
    if (!tile) return;
    const { tileX, tileY } = tile;

    if (!this.mapGrid.isInBounds(tileX, tileY)) return;

    if (this.ui.activeTool === 'place' && this.ui.placementGhost) {
      const ghost = this.ui.placementGhost;
      const valid = this.mapGrid.isFootprintFree(tileX, tileY, ghost.blueprint.footprint);
      this.ui.updateGhostPosition(tileX, tileY, valid);
      if (!valid) {
        this.showFeedback('⚠ 此位置已被占用');
        return;
      }

      const result = this.placement.placeBuilding(ghost.blueprint, tileX, tileY, ghost.rotation);
      if (result.ok) {
        this.audio.playPlaceSuccess();
        this.showFeedback(`✓ 已放置 ${ghost.blueprint.caption} (-${ghost.blueprint.copperCost}🟤)`);
        // Stay in placement mode for continuous placement
        this.ui.updateGhostPosition(tileX, tileY, false);
      } else if ('reason' in result) {
        if (result.reason.includes('insufficient')) this.audio.playInsufficientFunds();
        const reasonMap: Record<string, string> = {
          'insufficient-copper': '铜币不足',
          'insufficient-gold': '金币不足',
          collision: '位置被占用',
        };
        this.showFeedback(`✕ 放置失败: ${reasonMap[result.reason] ?? result.reason}`);
      }
      return;
    }

    if (this.ui.activeTool === 'move') {
      this.player.moveTo(tileX, tileY);
      return;
    }

    // Select tool: find building at tile
    if (this.ui.activeTool === 'select' || this.ui.activeTool === 'delete') {
      const building = this.mapGrid.getBuildingAt(tileX, tileY);
      if (!building) {
        if (this.ui.activeTool === 'select') {
          this.showFeedback('此处没有建筑');
          this.ui.selectBuilding(undefined);
        }
        return;
      }

      if (this.ui.activeTool === 'delete') {
        const bp = this.getBlueprintById(building.blueprintId);
        this.placement.removeBuilding(building.id);
        this.audio.playDelete();
        this.showFeedback(`🗑️ 已拆除 ${bp ? bp.caption : building.blueprintId}`);
        if (this.ui.selectedBuildingId === building.id) this.ui.selectBuilding(undefined);
      } else {
        const bp = this.getBlueprintById(building.blueprintId);
        this.ui.selectBuilding(building.id);
        this.showFeedback(`🔍 查看建筑: ${bp ? bp.caption : building.blueprintId}`);
      }
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (key === 'escape') {
      this.ui.cancelPlacement();
      return;
    }
    if (key === 'r' && this.ui.activeTool === 'place') {
      this.ui.rotateGhost();
      return;
    }

    const blueprintHotkeys: Record<string, string> = {
      '1': 'bookshelf',
      '2': 'bench',
      '3': 'noticeboard',
    };
    const blueprintId = blueprintHotkeys[key];
    if (!blueprintId) return;

    const blueprint = this.getBlueprintById(blueprintId);
    if (!blueprint || !blueprint.enabled) return;
    this.ui.startPlacement(blueprint);
  }

  private pointerToTile(event: PointerEvent): { tileX: number; tileY: number } | undefined {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const worldPos = this.camera.screenToWorld(screenX, screenY);
    return this.mapGrid.screenToTile(worldPos.x, worldPos.y);
  }
}
