import { AnimationFrameConfig, AnimationType, armorData, armTypes, characterData, SPRITE_SHEET } from '../config/characterConfig';
import type { Species } from '../types/Species';

export class CharacterAnimationInitializer {
  constructor(private scene: Phaser.Scene) {}

  private createAnimationHelper(config: {
    key: string;
    textureKey: string;
    frames: string[];
    frameRate: number;
    repeat: number;
    getFrameIndex: (pose: typeof characterData.poses[0]) => number;
  }) {
    // 检查动画是否已存在
    if (this.scene.anims.exists(config.key)) {
      return;
    }

    this.scene.anims.create({
      key: config.key,
      frames: config.frames.map(frameName => {
        const pose = characterData.poses.find(p => p.name === frameName)!;
        return {
          key: config.textureKey,
          frame: config.getFrameIndex(pose),
        };
      }),
      frameRate: config.frameRate,
      repeat: config.repeat,
    });
  }

  createCharacterAnimations(species: Species, gender: 'male' | 'female', armor: string | null) {
    // 为每个动画状态创建所有部件的动画
    (Object.entries(characterData.animations) as [AnimationType, AnimationFrameConfig][]).forEach(([animationType, config]) => {
      // 身体动画
      this.createAnimationHelper({
        key: `body-${animationType}`,
        textureKey: `${species}/body-${gender}.png`,
        frames: config.frames,
        frameRate: config.frameRate,
        repeat: config.repeat,
        getFrameIndex: pose => pose.bodyIndex[1] * SPRITE_SHEET.COLUMNS.BODY + pose.bodyIndex[0],
      });

      // 手臂动画
      armTypes[species].forEach(armType => {
        this.createAnimationHelper({
          key: `${armType}-${animationType}`,
          textureKey: `${species}/body-${armType}.png`,
          frames: config.frames,
          frameRate: config.frameRate,
          repeat: config.repeat,
          getFrameIndex: pose => pose.sleeveIndex[1] * SPRITE_SHEET.COLUMNS.BODY + pose.sleeveIndex[0],
        });
      });

      // 装甲动画
      if (armor) {
        const genderSuffix = gender === 'male' ? 'Male' : 'Female';
        const getArmorPartConfig = (part: typeof armorData.parts[number]) => {
          const needsGender = ['chest', 'pants'].includes(part);
          return {
            key: `armor-${part}`,
            textureKey: `${species}/armor-${armor}-${part}${needsGender ? genderSuffix : ''}.png`,
            getFrameIndex: (pose: typeof characterData.poses[0]) => {
              switch (part) {
                case 'chest':
                  return pose.chestIndex[1] * SPRITE_SHEET.COLUMNS.ARMOR.CHEST + pose.chestIndex[0];
                case 'frontSleeve':
                case 'backSleeve':
                  return pose.sleeveIndex[1] * SPRITE_SHEET.COLUMNS.ARMOR.SLEEVE + pose.sleeveIndex[0];
                case 'pants':
                  return pose.bodyIndex[1] * SPRITE_SHEET.COLUMNS.ARMOR.PANTS + pose.bodyIndex[0];
                default:
                  return 0;
              }
            },
          };
        };

        // 为每个装甲部件创建动画
        armorData.parts.forEach(part => {
          const partConfig = getArmorPartConfig(part);
          (Object.entries(characterData.animations) as [AnimationType, AnimationFrameConfig][]).forEach(
            ([animationType, config]) => {
              this.createAnimationHelper({
                key: `${partConfig.key}-${animationType}`,
                textureKey: partConfig.textureKey,
                frames: config.frames,
                frameRate: config.frameRate,
                repeat: config.repeat,
                getFrameIndex: partConfig.getFrameIndex,
              });
            },
          );
        });
      }
    });
  }
}
