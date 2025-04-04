import { Definitions } from '../types/GameData';

export interface FurnitureDefinition {
  colonyTags: string[];
  rarity: string;
  description: string;
  shortdescription: string;
  category: string;
}

export class FurnitureManager {
  private scene: Phaser.Scene;
  private definitions?: Record<string, FurnitureDefinition>;
  private placedFurniture: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.definitions = (scene.registry.get('definitions') as Definitions | undefined)?.furniture;
  }

  placeFurniture(itemID: string, x: number, y: number) {
    if (!this.definitions?.[itemID]) {
      console.warn(`Furniture type ${itemID} not found in definitions`);
      return;
    }

    const furniture = this.scene.add.sprite(x, y, 'objects', itemID);
    furniture.setData('type', itemID);
    furniture.setData('definition', this.definitions[itemID]);
    furniture.setInteractive();

    // 允许拖动家具
    this.scene.input.setDraggable(furniture);
    furniture.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      furniture.setPosition(dragX, dragY);
    });

    this.placedFurniture.push(furniture);
    return furniture;
  }

  getFurnitureAt(x: number, y: number) {
    return this.placedFurniture.find(furniture => {
      const bounds = furniture.getBounds();
      return bounds.contains(x, y);
    });
  }

  removeFurniture(furniture: Phaser.GameObjects.Sprite) {
    const index = this.placedFurniture.indexOf(furniture);
    if (index > -1) {
      this.placedFurniture.splice(index, 1);
      furniture.destroy();
    }
  }
}
