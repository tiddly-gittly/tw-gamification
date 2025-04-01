import { AnimationFrameConfig, AnimationType, CharacterConfig, characterData, SPRITE_SHEET } from '../config/characterConfig';
import { Species } from '../types/Species';

interface ICharacterDisplayOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  species?: Species;
  gender?: 'male' | 'female';
  config?: CharacterConfig;
  idlePoseIndex?: number;
}

/**
 * 负责角色的视觉展示,包括精灵创建、动画播放和外观管理
 */
export class CharacterDisplay extends Phaser.GameObjects.Container {
  // 将精灵分组为前中后三层，便于管理层级
  private readonly spriteGroups = {
    back: {
      backArm: null as Phaser.GameObjects.Sprite | null,
      backSleeve: null as Phaser.GameObjects.Sprite | null,
    },
    middle: {
      body: null as Phaser.GameObjects.Sprite | null,
      chest: null as Phaser.GameObjects.Sprite | null,
      pants: null as Phaser.GameObjects.Sprite | null,
    },
    front: {
      head: null as Phaser.GameObjects.Sprite | null,
      frontArm: null as Phaser.GameObjects.Sprite | null,
      frontSleeve: null as Phaser.GameObjects.Sprite | null,
      hair: null as Phaser.GameObjects.Sprite | null,
    },
  };

  // #region State
  #currentAnimation: AnimationType | null = null;
  #config: CharacterConfig;
  #gender: 'male' | 'female';
  #species: Species;
  // #endregion

  get gender() {
    return this.#gender;
  }

  constructor({ scene, x, y, species = 'human', gender = 'female', config, idlePoseIndex = 1 }: ICharacterDisplayOptions) {
    super(scene, x, y);
    scene.add.existing(this);

    // 初始化状态
    this.#species = species;
    this.#gender = gender;
    this.#config = config || this.getDefaultConfig();
    this.#config.defaultIdleIndex = idlePoseIndex;

    // 初始化精灵层级和基础动画
    this.initializeSprites();
    this.initializeBaseAnimations();

    // 设置初始状态
    this.updateEquipment(config?.shirtOption || null, config?.pantsOption || null);
    this.setAnimation(AnimationType.IDLE);
  }

  private initializeBaseAnimations() {
    (Object.entries(characterData.animations) as [AnimationType, AnimationFrameConfig][]).forEach(([animationType, config]) => {
      // 身体动画
      this.createAnimationHelper({
        key: `body-${animationType}`,
        textureKey: `${this.#species}/body-${this.#gender}.png`,
        frames: config.frames,
        frameRate: config.frameRate,
        repeat: config.repeat,
        getFrameIndex: (pose) => this.calculateFrameIndex(pose.bodyIndex, SPRITE_SHEET.COLUMNS.BODY),
      });

      // 手臂动画
      ['frontArm', 'backArm'].forEach(armType => {
        this.createAnimationHelper({
          key: `${armType}-${animationType}`,
          textureKey: `${this.#species}/body-${armType}.png`,
          frames: config.frames,
          frameRate: config.frameRate,
          repeat: config.repeat,
          getFrameIndex: (pose) => this.calculateFrameIndex(pose.sleeveIndex, SPRITE_SHEET.COLUMNS.BODY),
        });
      });
    });
  }

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

  private createClothingAnimations(clothingName: string, clothingType: 'chest' | 'pants') {
    const genderSuffix = this.#gender === 'male' ? 'Male' : 'Female';
    const parts = clothingType === 'chest'
      ? ['chest', 'frontSleeve', 'backSleeve']
      : ['pants'];

    (Object.entries(characterData.animations) as [AnimationType, AnimationFrameConfig][]).forEach(([animationType, config]) => {
      parts.forEach(part => {
        const needsGender = ['chest', 'pants'].includes(part);
        const key = `armor-${part}-${animationType}`;
        const textureKey = `${this.#species}/armor-${clothingName}-${part}${needsGender ? genderSuffix : ''}.png`;

        this.createAnimationHelper({
          key,
          textureKey,
          frames: config.frames,
          frameRate: config.frameRate,
          repeat: config.repeat,
          getFrameIndex: (pose) => {
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
        });
      });
    });
  }

  private initializeSprites() {
    // 按照层级顺序创建和添加精灵
    this.createAndAddSprites();

    // 设置初始外观
    this.setHairStyle(this.#config.hairOption);
    this.setHeadOption(this.#config.headOption);

    // 确保所有精灵居中对齐
    Object.values(this.spriteGroups).forEach(group => {
      Object.values(group).forEach(sprite => {
        sprite?.setOrigin(0.5, 0.5);
      });
    });
  }

  private createAndAddSprites() {
    // 后层
    this.spriteGroups.back.backArm = this.createBodySprite('backArm');
    this.add(this.spriteGroups.back.backArm);

    // 中层
    this.spriteGroups.middle.body = this.createBodySprite('body');
    this.add(this.spriteGroups.middle.body);

    // 前层
    this.spriteGroups.front.head = this.createHeadSprite();
    this.spriteGroups.front.frontArm = this.createBodySprite('frontArm');
    this.spriteGroups.front.hair = this.createBodySprite('accessories');

    this.add([
      this.spriteGroups.front.head,
      this.spriteGroups.front.frontArm,
      this.spriteGroups.front.hair,
    ]);
  }

  private createBodySprite(type: 'body' | 'backArm' | 'frontArm' | 'accessories'): Phaser.GameObjects.Sprite {
    const key = type === 'body'
      ? `${this.#species}/body-${this.#gender}.png`
      : `${this.#species}/body-${type}.png`;
    const sprite = this.scene.make.sprite({ key });
    sprite.name = `character-${type}`; // 添加名字
    return sprite;
  }

  private createHeadSprite(): Phaser.GameObjects.Sprite {
    const key = `${this.#species}/head-${this.#gender}.png`;
    const sprite = this.scene.make.sprite({ key });
    sprite.name = 'character-head'; // 添加名字
    return sprite;
  }

  public destroy() {
    const sprites = [
      this.spriteGroups.middle.body,
      this.spriteGroups.front.hair,
      this.spriteGroups.front.head,
      this.spriteGroups.front.frontArm,
      this.spriteGroups.back.backArm,
      this.spriteGroups.middle.chest,
      this.spriteGroups.front.frontSleeve,
      this.spriteGroups.back.backSleeve,
      this.spriteGroups.middle.pants,
    ];
    sprites.forEach(sprite => sprite?.destroy());
    super.destroy();
  }

  // #region Animation
  public setAnimation(animationType: AnimationType) {
    console.log('Setting animation:', animationType);

    // 先停止所有当前播放的动画
    this.stopAnimation();

    // 更新当前动画状态
    this.#currentAnimation = animationType;

    // 静态姿势和动画序列使用不同的处理方法
    if (animationType === AnimationType.IDLE || animationType === AnimationType.DUCK) {
      this.setStaticPose(animationType);
    } else {
      const animConfig = characterData.animations[animationType];
      if (!animConfig) {
        console.warn(`Animation "${animationType}" not found`);
        return;
      }
      this.playAnimationSequence(animationType, animConfig);
    }
  }

  public changeDefaultIdlePose(index: number) {
    if (index < 1 || index > 5) {
      console.warn('Idle pose index must be between 1 and 5');
      return;
    }
    this.#config.defaultIdleIndex = index;
    if (this.#currentAnimation === AnimationType.IDLE) {
      this.setAnimation(AnimationType.IDLE);
    }
  }

  public changeToRandomIdlePose() {
    const randomIndex = Math.floor(Math.random() * 5) + 1;
    this.changeDefaultIdlePose(randomIndex);
  }

  private setStaticPose(animationType: AnimationType) {
    const poseName = animationType === AnimationType.IDLE
      ? `idle-${this.#config.defaultIdleIndex}`
      : 'ducking';

    const pose = characterData.poses.find(p => p.name === poseName);
    if (!pose) {
      console.warn(`Pose "${poseName}" not found`);
      return;
    }

    this.updateStaticFrames(pose);
    this.updateLayerPositions(pose);
  }

  private playAnimationSequence(animationType: AnimationType, config: typeof characterData.animations[AnimationType]) {
    // 播放基础动画
    this.spriteGroups.middle.body?.play(`body-${animationType}`);
    this.spriteGroups.front.frontArm?.play(`frontArm-${animationType}`);
    this.spriteGroups.back.backArm?.play(`backArm-${animationType}`);

    // 播放装备动画
    if (this.spriteGroups.middle.chest) {
      this.spriteGroups.middle.chest.play(`armor-chest-${animationType}`);
      this.spriteGroups.front.frontSleeve?.play(`armor-frontSleeve-${animationType}`);
      this.spriteGroups.back.backSleeve?.play(`armor-backSleeve-${animationType}`);
      this.spriteGroups.middle.pants?.play(`armor-pants-${animationType}`);
    }

    // 在身体播放动画时，重新定位头部和衣服的位置，以防运动贴图的动作幅度过大，让身体和这些部位的相对位置发生不一致
    this.spriteGroups.middle.body?.on('animationupdate', () => {
      const currentFrame = this.spriteGroups.middle.body?.anims.currentFrame;
      const frameIndex = currentFrame?.index ?? 0;
      const poseName = config.frames[frameIndex];
      const pose = characterData.poses.find(p => p.name === poseName);
      if (pose) {
        this.updateLayerPositions(pose);
      }
    });

    // 触发动画完成事件，并清理事件处理器
    this.spriteGroups.middle.body?.once('animationcomplete', () => {
      this.spriteGroups.middle.body?.off('animationupdate');
      this.emit('animationcomplete', { animation: animationType });
    });
  }

  /** 计算精灵表中的帧索引 */
  private calculateFrameIndex(position: [number, number], columnCount: number): number {
    const [x, y] = position;
    return y * columnCount + x;
  }

  private updateStaticFrames(pose: typeof characterData.poses[0]) {
    if (!this.spriteGroups.middle.body || !this.spriteGroups.front.frontArm || !this.spriteGroups.back.backArm) return;

    // 根据 pose 索引设置正确的帧
    const bodyFrame = this.calculateFrameIndex(pose.bodyIndex, SPRITE_SHEET.COLUMNS.BODY);
    const armFrame = this.calculateFrameIndex(pose.sleeveIndex, SPRITE_SHEET.COLUMNS.BODY);

    this.spriteGroups.middle.body.setFrame(bodyFrame);
    this.spriteGroups.front.frontArm.setFrame(armFrame);
    this.spriteGroups.back.backArm.setFrame(armFrame);

    if (this.spriteGroups.middle.chest) {
      const chestFrame = this.calculateFrameIndex(pose.chestIndex, SPRITE_SHEET.COLUMNS.ARMOR.CHEST);
      const sleeveFrame = this.calculateFrameIndex(pose.sleeveIndex, SPRITE_SHEET.COLUMNS.ARMOR.SLEEVE);
      const pantsFrame = this.calculateFrameIndex(pose.bodyIndex, SPRITE_SHEET.COLUMNS.ARMOR.PANTS);

      this.spriteGroups.middle.chest.setFrame(chestFrame);
      this.spriteGroups.front.frontSleeve?.setFrame(sleeveFrame);
      this.spriteGroups.back.backSleeve?.setFrame(sleeveFrame);
      this.spriteGroups.middle.pants?.setFrame(pantsFrame);
    }
  }

  private updateLayerPositions(pose: typeof characterData.poses[0]) {
    // 使用 nudge 值精确调整每个部位的位置（以像素为单位）
    const [armNudgeX, armNudgeY] = pose.sleeveNudge;

    // 手臂位置调整
    [
      this.spriteGroups.front.frontArm,
      this.spriteGroups.back.backArm,
      this.spriteGroups.front.frontSleeve,
      this.spriteGroups.back.backSleeve,
    ].forEach(sprite => {
      if (sprite) {
        sprite.x = armNudgeX;
        sprite.y = armNudgeY;
      }
    });

    // 头发和头部位置调整（使用相同的偏移值）
    const [hairNudgeX, hairNudgeY] = pose.hairNudge;
    if (this.spriteGroups.front.hair) {
      this.spriteGroups.front.hair.x = hairNudgeX;
      this.spriteGroups.front.hair.y = hairNudgeY;
    }
    if (this.spriteGroups.front.head) {
      this.spriteGroups.front.head.x = hairNudgeX;
      this.spriteGroups.front.head.y = hairNudgeY;
    }

    // 胸甲位置调整
    if (this.spriteGroups.middle.chest) {
      const [chestNudgeX, chestNudgeY] = pose.chestNudge;
      this.spriteGroups.middle.chest.x = chestNudgeX;
      this.spriteGroups.middle.chest.y = chestNudgeY;
    }
  }

  public stopAnimation() {
    [
      this.spriteGroups.middle.body,
      this.spriteGroups.front.frontArm,
      this.spriteGroups.back.backArm,
      this.spriteGroups.middle.chest,
      this.spriteGroups.front.frontSleeve,
      this.spriteGroups.back.backSleeve,
      this.spriteGroups.middle.pants,
    ].forEach(sprite => {
      // 清理动画更新事件监听器
      sprite?.off('animationupdate');
      // 清理动画完成事件监听器
      sprite?.off('animationcomplete');
      // 停止动画
      sprite?.stop();
    });
  }

  // #endregion

  // #region Appearance
  public setHairStyle(hairIndex: number) {
    const genderConfig = characterData.species.human[this.#gender].hair;
    // 确保不超过最大值
    if (hairIndex >= genderConfig.count) {
      console.warn(`Hair index ${hairIndex} exceeds maximum count ${genderConfig.count} for ${this.#gender}`);
      return;
    }
    const frame = this.calculateFrameIndex([hairIndex, genderConfig.offsetY], SPRITE_SHEET.COLUMNS.ACCESSORIES);
    this.spriteGroups.front.hair?.setFrame(frame);
    this.#config.hairOption = hairIndex;
  }

  // 新增头部设置方法
  public setHeadOption(headIndex: number) {
    // 使用第一行第二列的头部贴图
    const frame = 1; // 固定使用第二列（索引1）
    this.spriteGroups.front.head?.setFrame(frame);
    this.#config.headOption = headIndex;
  }

  private updateEquipment(shirtOption: string | null, pantsOption: string | null) {
    // 清理现有装备精灵
    this.clearArmorSprites();

    // 分别创建上衣和裤子的动画和精灵
    if (shirtOption) {
      this.createClothingAnimations(shirtOption, 'chest');
      this.createShirtSprites(shirtOption);
    }
    if (pantsOption) {
      this.createClothingAnimations(pantsOption, 'pants');
      this.createPantsSprites(pantsOption);
    }

    // 重新排序所有精灵以确保正确的层级
    this.sortSpriteLayers();
  }

  private sortSpriteLayers() {
    // 移除所有精灵
    this.removeAll();

    // 定义类型保护函数
    const isSprite = (sprite: Phaser.GameObjects.Sprite | null): sprite is Phaser.GameObjects.Sprite => {
      return sprite !== null;
    };

    // 按照正确的层级顺序重新添加
    // 1. 背部层
    this.add([
      this.spriteGroups.back.backArm,
      this.spriteGroups.back.backSleeve,
    ].filter(isSprite));

    // 2. 中间层
    this.add([
      this.spriteGroups.middle.body,
      this.spriteGroups.middle.chest,
      this.spriteGroups.middle.pants,
    ].filter(isSprite));

    // 3. 前部层
    this.add([
      this.spriteGroups.front.head,
      this.spriteGroups.front.frontArm,
      this.spriteGroups.front.frontSleeve,
      this.spriteGroups.front.hair,
    ].filter(isSprite));
  }

  private createShirtSprites(shirtName: string) {
    const genderSuffix = this.#gender === 'male' ? 'Male' : 'Female';

    this.spriteGroups.back.backSleeve = this.scene.make.sprite({
      key: `${this.#species}/armor-${shirtName}-backSleeve.png`,
    });
    this.spriteGroups.middle.chest = this.scene.make.sprite({
      key: `${this.#species}/armor-${shirtName}-chest${genderSuffix}.png`,
    });
    this.spriteGroups.front.frontSleeve = this.scene.make.sprite({
      key: `${this.#species}/armor-${shirtName}-frontSleeve.png`,
    });

    this.sortSpriteLayers();
  }

  private createPantsSprites(pantsName: string) {
    const genderSuffix = this.#gender === 'male' ? 'Male' : 'Female';

    this.spriteGroups.middle.pants = this.scene.make.sprite({
      key: `${this.#species}/armor-${pantsName}-pants${genderSuffix}.png`,
    });

    this.sortSpriteLayers();
  }

  private clearArmorSprites() {
    // 清理装备精灵
    this.spriteGroups.back.backSleeve?.destroy();
    this.spriteGroups.middle.chest?.destroy();
    this.spriteGroups.front.frontSleeve?.destroy();
    this.spriteGroups.middle.pants?.destroy();

    this.spriteGroups.back.backSleeve = null;
    this.spriteGroups.middle.chest = null;
    this.spriteGroups.front.frontSleeve = null;
    this.spriteGroups.middle.pants = null;
  }

  public setAppearance(config: Partial<CharacterConfig>) {
    // 更新基础配置
    const oldConfig = this.#config;
    this.#config = { ...this.#config, ...config };

    // 检查是否需要更新装备
    if (oldConfig.shirtOption !== config.shirtOption || oldConfig.pantsOption !== config.pantsOption) {
      this.updateEquipment(config.shirtOption ?? oldConfig.shirtOption, config.pantsOption ?? oldConfig.pantsOption);
    }

    // 更新其他外观
    this.setHairStyle(this.#config.hairOption);
    this.setHeadOption(this.#config.headOption);
  }
  // #endregion

  // #region Utility Methods
  private getDefaultConfig(): CharacterConfig {
    return {
      skinColor: 0,
      hairOption: 0,
      headOption: 0,
      shirtOption: null,
      shirtColor: 0,
      pantsOption: null,
      pantsColor: 0,
      helmetOption: 0,
      defaultIdleIndex: 1,
    };
  }

  public getCurrentAnimation(): AnimationType | null {
    return this.#currentAnimation;
  }
  // #endregion
}
