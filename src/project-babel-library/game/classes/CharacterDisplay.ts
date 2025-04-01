import { AnimationType, armorData, CharacterConfig, characterData, SPRITE_SHEET } from '../config/characterConfig';
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
  // #region Sprites
  #bodySprite: Phaser.GameObjects.Sprite | null = null;
  #hairSprite: Phaser.GameObjects.Sprite | null = null;
  #headSprite: Phaser.GameObjects.Sprite | null = null;
  #frontArmSprite: Phaser.GameObjects.Sprite | null = null;
  #backArmSprite: Phaser.GameObjects.Sprite | null = null;
  #armorChestSprite: Phaser.GameObjects.Sprite | null = null;
  #armorFrontSleeveSprite: Phaser.GameObjects.Sprite | null = null;
  #armorBackSleeveSprite: Phaser.GameObjects.Sprite | null = null;
  #armorPantsSprite: Phaser.GameObjects.Sprite | null = null;
  // #endregion

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

    // 初始化精灵层级
    this.initializeSprites();

    // 设置初始状态
    this.setArmor(config?.armor || null);
    this.setAnimation(AnimationType.IDLE);
  }

  private initializeSprites() {
    // 创建基础精灵
    this.#backArmSprite = this.createBodySprite('backArm');
    this.#bodySprite = this.createBodySprite('body');
    this.#frontArmSprite = this.createBodySprite('frontArm');
    this.#hairSprite = this.createBodySprite('accessories');
    this.#headSprite = this.createHeadSprite();

    // 按层级顺序添加精灵 (头部应该在身体之上，头发之下)
    this.add(this.#backArmSprite);
    this.add(this.#bodySprite);
    this.add(this.#headSprite);
    this.add(this.#frontArmSprite);
    this.add(this.#hairSprite);

    // 使用统一的头发设置方法
    this.setHairStyle(this.#config.hairOption);
    this.setHeadOption(this.#config.headOption);

    // 确保所有精灵居中对齐
    [this.#bodySprite, this.#hairSprite, this.#headSprite, this.#frontArmSprite, this.#backArmSprite].forEach(sprite => {
      sprite.setOrigin(0.5, 0.5);
    });
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
      this.#bodySprite,
      this.#hairSprite,
      this.#headSprite,
      this.#frontArmSprite,
      this.#backArmSprite,
      this.#armorChestSprite,
      this.#armorFrontSleeveSprite,
      this.#armorBackSleeveSprite,
      this.#armorPantsSprite,
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
    // 播放动画序列
    this.#bodySprite?.play(`body-${animationType}`);
    this.#frontArmSprite?.play(`frontArm-${animationType}`);
    this.#backArmSprite?.play(`backArm-${animationType}`);

    if (this.#armorChestSprite) {
      this.#armorChestSprite.play(`armor-chest-${animationType}`);
      this.#armorFrontSleeveSprite?.play(`armor-frontSleeve-${animationType}`);
      this.#armorBackSleeveSprite?.play(`armor-backSleeve-${animationType}`);
      this.#armorPantsSprite?.play(`armor-pants-${animationType}`);
    }

    // 在身体播放动画时，重新定位头部和衣服的位置，以防运动贴图的动作幅度过大，让身体和这些部位的相对位置发生不一致
    this.#bodySprite?.on('animationupdate', () => {
      const currentFrame = this.#bodySprite?.anims.currentFrame;
      const frameIndex = currentFrame?.index ?? 0;
      const poseName = config.frames[frameIndex];
      const pose = characterData.poses.find(p => p.name === poseName);
      if (pose) {
        this.updateLayerPositions(pose);
      }
    });

    // 触发动画完成事件，并清理事件处理器
    this.#bodySprite?.once('animationcomplete', () => {
      this.#bodySprite?.off('animationupdate');
      this.emit('animationcomplete', { animation: animationType });
    });
  }

  /** 计算精灵表中的帧索引 */
  private calculateFrameIndex(position: [number, number], columnCount: number): number {
    const [x, y] = position;
    return y * columnCount + x;
  }

  private updateStaticFrames(pose: typeof characterData.poses[0]) {
    if (!this.#bodySprite || !this.#frontArmSprite || !this.#backArmSprite) return;

    // 根据 pose 索引设置正确的帧
    const bodyFrame = this.calculateFrameIndex(pose.bodyIndex, SPRITE_SHEET.COLUMNS.BODY);
    const armFrame = this.calculateFrameIndex(pose.sleeveIndex, SPRITE_SHEET.COLUMNS.BODY);

    this.#bodySprite.setFrame(bodyFrame);
    this.#frontArmSprite.setFrame(armFrame);
    this.#backArmSprite.setFrame(armFrame);

    if (this.#armorChestSprite) {
      const chestFrame = this.calculateFrameIndex(pose.chestIndex, SPRITE_SHEET.COLUMNS.ARMOR.CHEST);
      const sleeveFrame = this.calculateFrameIndex(pose.sleeveIndex, SPRITE_SHEET.COLUMNS.ARMOR.SLEEVE);
      const pantsFrame = this.calculateFrameIndex(pose.bodyIndex, SPRITE_SHEET.COLUMNS.ARMOR.PANTS);

      this.#armorChestSprite.setFrame(chestFrame);
      this.#armorFrontSleeveSprite?.setFrame(sleeveFrame);
      this.#armorBackSleeveSprite?.setFrame(sleeveFrame);
      this.#armorPantsSprite?.setFrame(pantsFrame);
    }
  }

  private updateLayerPositions(pose: typeof characterData.poses[0]) {
    // 使用 nudge 值精确调整每个部位的位置（以像素为单位）
    const [armNudgeX, armNudgeY] = pose.sleeveNudge;

    // 手臂位置调整
    [
      this.#frontArmSprite,
      this.#backArmSprite,
      this.#armorFrontSleeveSprite,
      this.#armorBackSleeveSprite,
    ].forEach(sprite => {
      if (sprite) {
        sprite.x = armNudgeX;
        sprite.y = armNudgeY;
      }
    });

    // 头发和头部位置调整（使用相同的偏移值）
    const [hairNudgeX, hairNudgeY] = pose.hairNudge;
    if (this.#hairSprite) {
      this.#hairSprite.x = hairNudgeX;
      this.#hairSprite.y = hairNudgeY;
    }
    if (this.#headSprite) {
      this.#headSprite.x = hairNudgeX;
      this.#headSprite.y = hairNudgeY;
    }

    // 胸甲位置调整
    if (this.#armorChestSprite) {
      const [chestNudgeX, chestNudgeY] = pose.chestNudge;
      this.#armorChestSprite.x = chestNudgeX;
      this.#armorChestSprite.y = chestNudgeY;
    }
  }

  public stopAnimation() {
    [
      this.#bodySprite,
      this.#frontArmSprite,
      this.#backArmSprite,
      this.#armorChestSprite,
      this.#armorFrontSleeveSprite,
      this.#armorBackSleeveSprite,
      this.#armorPantsSprite,
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
    this.#hairSprite?.setFrame(frame);
    this.#config.hairOption = hairIndex;
  }

  // 新增头部设置方法
  public setHeadOption(headIndex: number) {
    // 使用第一行第二列的头部贴图
    const frame = 1; // 固定使用第二列（索引1）
    this.#headSprite?.setFrame(frame);
    this.#config.headOption = headIndex;
  }

  public setArmor(armorName: string | null) {
    // 清理现有装备
    [
      this.#armorChestSprite,
      this.#armorFrontSleeveSprite,
      this.#armorBackSleeveSprite,
      this.#armorPantsSprite,
    ].forEach(sprite => sprite?.destroy());
    // DEBUG: console armorName
    console.log(`setArmor armorName`, armorName);

    this.#armorChestSprite = null;
    this.#armorFrontSleeveSprite = null;
    this.#armorBackSleeveSprite = null;
    this.#armorPantsSprite = null;

    if (armorName && armorData.names.includes(armorName)) {
      this.createArmorSprites(armorName);
    }
  }

  private createArmorSprites(armorName: string) {
    const genderSuffix = this.#gender === 'male' ? 'Male' : 'Female';
    // DEBUG: console armorName
    console.log(`createArmorSprites armorName`, armorName);
    // 按照层级顺序创建装备精灵，并添加名字
    this.#armorBackSleeveSprite = this.scene.make.sprite({
      key: `${this.#species}/armor-${armorName}-backSleeve.png`,
    });
    this.#armorBackSleeveSprite.name = `character-armor-backSleeve-${armorName}`;
    this.add(this.#armorBackSleeveSprite);

    this.#armorPantsSprite = this.scene.make.sprite({
      key: `${this.#species}/armor-${armorName}-pants${genderSuffix}.png`,
    });
    this.#armorPantsSprite.name = `character-armor-pants-${armorName}`;
    this.add(this.#armorPantsSprite);

    this.#armorChestSprite = this.scene.make.sprite({
      key: `${this.#species}/armor-${armorName}-chest${genderSuffix}.png`,
    });
    this.#armorChestSprite.name = `character-armor-chest-${armorName}`;
    this.add(this.#armorChestSprite);

    this.#armorFrontSleeveSprite = this.scene.make.sprite({
      key: `${this.#species}/armor-${armorName}-frontSleeve.png`,
    });
    this.#armorFrontSleeveSprite.name = `character-armor-frontSleeve-${armorName}`;
    this.add(this.#armorFrontSleeveSprite);
  }

  public setAppearance(config: Partial<CharacterConfig>) {
    this.#config = { ...this.#config, ...config };
    this.setHairStyle(this.#config.hairOption);
    this.setHeadOption(this.#config.headOption);
  }
  // #endregion

  // #region Utility Methods
  private getDefaultConfig(): CharacterConfig {
    return {
      skinColor: 0,
      armor: 'workout',
      hairOption: 0,
      headOption: 0,
      shirtOption: 0,
      shirtColor: 0,
      pantsOption: 0,
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
