import { CharacterDisplay } from './classes/CharacterDisplay';
import { AnimationType, characterData } from './config/characterConfig';

export function create(this: Phaser.Scene) {
  this.cameras.main.setBackgroundColor('#ffffff');

  const character = new CharacterDisplay({
    scene: this,
    x: this.cameras.main.centerX, // 改为屏幕中心
    y: this.cameras.main.centerY, // 改为屏幕中心
    species: 'human',
    gender: 'female',
    config: {
      skinColor: 0,
      shirtOption: 'workout',
      shirtColor: 2,
      pantsOption: 'cool',
      pantsColor: 3,
      hairOption: 4,
      headOption: 0,
      helmetOption: 0,
      defaultIdleIndex: 2,
    },
  });

  // 创建按键控制
  const keys = this.input.keyboard?.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D,
    space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
  }) as Phaser.Types.Input.Keyboard.CursorKeys;

  let isJumping = false;

  // 添加测试按键
  this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
    switch (event.code) {
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5': {
        const poseNumber = parseInt(event.code.replace('Digit', ''));
        character.changeDefaultIdlePose(poseNumber);
        break;
      }
      case 'KeyH': {
        const randomHair = Math.floor(Math.random() * characterData.species.human[character.gender].hair.count);
        character.setHairStyle(randomHair);
        break;
      }
      case 'KeyR':
        character.changeToRandomIdlePose();
        break;
    }
  });

  // 更新循环
  this.events.on('update', () => {
    let nextAnimation = AnimationType.IDLE;

    // 如果角色正在跳跃或下落，保持当前动画状态
    if (isJumping || character.getCurrentAnimation() === AnimationType.FALL) {
      return;
    }

    if (keys.left.isDown || keys.right.isDown) {
      nextAnimation = keys.shift.isDown ? AnimationType.RUN : AnimationType.WALK;
      const speed = 0; // keys.shift.isDown ? 4 : 2;
      character.x += keys.left.isDown ? -speed : speed;
      character.setScale(keys.left.isDown ? -1 : 1, 1);
    } else if (keys.down.isDown) {
      nextAnimation = AnimationType.DUCK;
    } else if (keys.up.isDown) {
      nextAnimation = AnimationType.SWIM;
    } else if (keys.space.isDown && !isJumping) {
      nextAnimation = AnimationType.JUMP;
      isJumping = true;
      character.once('animationcomplete', () => {
        isJumping = false;
        character.setAnimation(AnimationType.FALL);
      });
    } else {
      nextAnimation = AnimationType.IDLE; // 当没有任何按键按下时，恢复到空闲状态
    }

    // 只有当需要切换到新动画时才更新
    if (character.getCurrentAnimation() !== nextAnimation) {
      character.setAnimation(nextAnimation);
    }
  });
}
