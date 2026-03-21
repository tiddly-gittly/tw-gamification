/**
 * ContentBindingSystem — links content-capable buildings to TiddlyWiki tiddlers
 * and produces lightweight preview data for the details panel.
 *
 * Content modes:
 *   bookshelf    — shows title, summary, icon from a linked tiddler
 *   noticeboard  — shows caption/summary snippet; resident can "read" it
 *   monument     — shows full caption + icon in a prominent frame
 *   none         — no content binding
 *
 * PLAN Phase 5 — domain layer
 */

import type { GardenBuildingInstance } from '../../types/building-types';
import type { ContentMode, GardenContentBinding, GardenContentPreviewData } from '../../types/content-types';

declare const $tw: {
  wiki: {
    getTiddler(title: string): { fields: Record<string, string> } | null;
    renderText(outputType: string, textType: string, text: string): string;
  };
};

export class ContentBindingSystem {
  /**
   * Build preview data for display in the lightweight details panel.
   * Returns undefined if the building has no content binding.
   */
  getPreviewData(building: GardenBuildingInstance): GardenContentPreviewData | undefined {
    if (building.contentMode === 'none' || !building.contentSourceTiddler) return undefined;

    const tiddler = $tw.wiki.getTiddler(building.contentSourceTiddler);
    if (!tiddler) {
      return {
        title: building.contentSourceTiddler,
        caption: building.contentSourceTiddler,
        summary: '(条目不存在)',
        icon: '',
        contentMode: building.contentMode,
        canOpen: false,
      };
    }

    const fields = tiddler.fields;
    const caption = String(fields.caption ?? fields.title ?? building.contentSourceTiddler);
    const summary = this.extractSummary(fields, building);
    const icon = this.resolveIcon(fields, building);

    return {
      title: String(fields.title ?? ''),
      caption,
      summary,
      icon,
      contentMode: building.contentMode,
      canOpen: true,
    };
  }

  /**
   * Bind a tiddler to a building by updating its content binding fields.
   * Callers should persist the change via WorldStateSystem.updateBuilding().
   */
  buildContentBinding(
    tiddlerTitle: string,
    mode: ContentMode,
    overrides?: Partial<GardenContentBinding>,
  ): GardenContentBinding {
    return {
      contentMode: mode,
      contentSourceTiddler: tiddlerTitle,
      contentSummaryField: 'description',
      ...overrides,
    };
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private extractSummary(fields: Record<string, string>, building: GardenBuildingInstance): string {
    const summaryField = building.contentSummaryField ?? 'description';

    if (fields[summaryField]) return String(fields[summaryField]).slice(0, 200);

    // Fall back to first 120 chars of text
    if (fields.text) {
      const raw = String(fields.text).replace(/\\\w+|\{\{[^}]+\}\}|<[^>]+>/g, '').trim();
      return raw.slice(0, 120) + (raw.length > 120 ? '…' : '');
    }

    return '';
  }

  private resolveIcon(fields: Record<string, string>, building: GardenBuildingInstance): string {
    const source = building.contentIconSource;
    if (!source) return String(fields.icon ?? '');
    if (source.startsWith('field:')) {
      const fieldName = source.slice(6);
      return String(fields[fieldName] ?? '');
    }
    return source;
  }
}
