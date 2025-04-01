export const SPRITE_SHEET = {
  FRAME_WIDTH: 43,
  FRAME_HEIGHT: 43,
  COLUMNS: {
    HEAD: 2, // head-*.png 脸部眼睛贴图
    ACCESSORIES: 22, // body-accessories.png 发型等装饰品
    BODY: 9, // body-backArm.png, body-frontArm.png, body-female.png, body-male.png 等身体部件
    ARMOR: {
      CHEST: 2, // armor-*-chest*.png 胸甲
      SLEEVE: 9, // armor-*-frontSleeve.png, armor-*-backSleeve.png 袖子
      PANTS: 9, // armor-*-pants*.png 裤子
    },
  },
};

export interface HairConfig {
  offsetY: number;
  count: number;
}

export interface GenderConfig {
  hair: HairConfig;
}

export interface PoseConfig {
  name: string;
  index: number;
  bodyIndex: [number, number];
  sleeveIndex: [number, number];
  sleeveNudge: [number, number];
  chestIndex: [number, number];
  chestNudge: [number, number];
  hairNudge: [number, number];
}

// TODO: 这个可能还需要保留，但是改名为 clothingTypes
export const armorData = {
  names: ['concept', 'cool', 'sweatervest', 'workout', null],
  parts: ['chest', 'frontSleeve', 'backSleeve', 'pants'],
};

export const armTypes = {
  human: ['frontArm', 'backArm'],
};

export enum AnimationType {
  IDLE = 'idle',
  WALK = 'walk',
  RUN = 'run',
  JUMP = 'jump',
  FALL = 'fall',
  SWIM = 'swim',
  DUCK = 'duck',
}

export interface CharacterConfig {
  skinColor: number;
  hairOption: number;
  headOption: number;
  shirtOption: string | null;
  shirtColor: number;
  pantsOption: string | null;
  pantsColor: number;
  helmetOption: number;
  defaultIdleIndex: number;
}

export interface AnimationFrameConfig {
  frames: string[];
  frameRate: number;
  repeat: number;
}

export const characterData = Object.freeze({
  species: {
    human: {
      male: {
        hair: { offsetY: 1, count: 61 },
      },
      female: {
        hair: { offsetY: 4, count: 55 },
      },
    },
  },
  poses: [
    {
      name: 'idle-1',
      index: 1,
      bodyIndex: [1, 0],
      sleeveIndex: [1, 0],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, 0],
      hairNudge: [0, 0],
    },
    {
      name: 'idle-2',
      index: 2,
      bodyIndex: [2, 0],
      sleeveIndex: [2, 0],
      sleeveNudge: [0, 0],
      chestIndex: [0, 1],
      chestNudge: [0, 0],
      hairNudge: [-1, 0],
    },
    {
      name: 'idle-3',
      index: 3,
      bodyIndex: [3, 0],
      sleeveIndex: [3, 0],
      sleeveNudge: [0, 0],
      chestIndex: [1, 1],
      chestNudge: [0, 0],
      hairNudge: [-1, 0],
    },
    {
      name: 'idle-4',
      index: 4,
      bodyIndex: [4, 0],
      sleeveIndex: [4, 0],
      sleeveNudge: [0, 0],
      chestIndex: [0, 1],
      chestNudge: [0, 0],
      hairNudge: [-1, 0],
    },
    {
      name: 'idle-5',
      index: 5,
      bodyIndex: [5, 0],
      sleeveIndex: [5, 0],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, 0],
      hairNudge: [0, 0],
    },
    {
      name: 'sitting',
      index: 6,
      bodyIndex: [6, 0],
      sleeveIndex: [1, 0],
      sleeveNudge: [0, 1],
      chestIndex: [1, 0],
      chestNudge: [0, 1],
      hairNudge: [0, 1],
    },
    {
      name: 'ducking',
      index: 7,
      bodyIndex: [8, 0],
      sleeveIndex: [8, 0],
      sleeveNudge: [0, 0],
      chestIndex: [1, 3],
      chestNudge: [0, 0],
      hairNudge: [1, 8],
    },
    {
      name: 'walk-1',
      index: 8,
      bodyIndex: [1, 1],
      sleeveIndex: [3, 1],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, 1],
      hairNudge: [0, 1],
    },
    {
      name: 'walk-2',
      index: 9,
      bodyIndex: [2, 1],
      sleeveIndex: [2, 1],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, 2],
      hairNudge: [0, 2],
    },
    {
      name: 'walk-3',
      index: 10,
      bodyIndex: [3, 1],
      sleeveIndex: [3, 1],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, 1],
      hairNudge: [0, 1],
    },
    {
      name: 'walk-4',
      index: 11,
      bodyIndex: [4, 1],
      sleeveIndex: [4, 1],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, 0],
      hairNudge: [0, 0],
    },
    {
      name: 'walk-5',
      index: 12,
      bodyIndex: [5, 1],
      sleeveIndex: [5, 1],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, 1],
      hairNudge: [0, 1],
    },
    {
      name: 'walk-6',
      index: 13,
      bodyIndex: [6, 1],
      sleeveIndex: [6, 1],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, 2],
      hairNudge: [0, 2],
    },
    {
      name: 'walk-7',
      index: 14,
      bodyIndex: [7, 1],
      sleeveIndex: [5, 1],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, 1],
      hairNudge: [0, 1],
    },
    {
      name: 'walk-8',
      index: 15,
      bodyIndex: [8, 1],
      sleeveIndex: [4, 1],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, 0],
      hairNudge: [0, 0],
    },
    {
      name: 'run-1',
      index: 16,
      bodyIndex: [1, 2],
      sleeveIndex: [3, 2],
      sleeveNudge: [0, 0],
      chestIndex: [1, 2],
      chestNudge: [0, 0],
      hairNudge: [1, 0],
    },
    {
      name: 'run-2',
      index: 17,
      bodyIndex: [2, 2],
      sleeveIndex: [2, 2],
      sleeveNudge: [0, 0],
      chestIndex: [1, 2],
      chestNudge: [0, -1],
      hairNudge: [1, -1],
    },
    {
      name: 'run-3',
      index: 18,
      bodyIndex: [3, 2],
      sleeveIndex: [3, 2],
      sleeveNudge: [0, 0],
      chestIndex: [1, 2],
      chestNudge: [0, 0],
      hairNudge: [1, 0],
    },
    {
      name: 'run-4',
      index: 19,
      bodyIndex: [4, 2],
      sleeveIndex: [4, 2],
      sleeveNudge: [0, 0],
      chestIndex: [1, 2],
      chestNudge: [0, 1],
      hairNudge: [1, 1],
    },
    {
      name: 'run-5',
      index: 20,
      bodyIndex: [5, 2],
      sleeveIndex: [5, 2],
      sleeveNudge: [0, 0],
      chestIndex: [1, 2],
      chestNudge: [0, 0],
      hairNudge: [1, 0],
    },
    {
      name: 'run-6',
      index: 21,
      bodyIndex: [6, 2],
      sleeveIndex: [6, 2],
      sleeveNudge: [0, 0],
      chestIndex: [1, 2],
      chestNudge: [0, -1],
      hairNudge: [1, -1],
    },
    {
      name: 'run-7',
      index: 22,
      bodyIndex: [7, 2],
      sleeveIndex: [5, 2],
      sleeveNudge: [0, 0],
      chestIndex: [1, 2],
      chestNudge: [0, 0],
      hairNudge: [1, 0],
    },
    {
      name: 'run-8',
      index: 23,
      bodyIndex: [8, 2],
      sleeveIndex: [4, 2],
      sleeveNudge: [0, 0],
      chestIndex: [1, 2],
      chestNudge: [0, 1],
      hairNudge: [1, 1],
    },
    {
      name: 'jump-1',
      index: 24,
      bodyIndex: [1, 3],
      sleeveIndex: [1, 3],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, -1],
      hairNudge: [0, -1],
    },
    {
      name: 'jump-2',
      index: 25,
      bodyIndex: [2, 3],
      sleeveIndex: [2, 3],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, -1],
      hairNudge: [0, -1],
    },
    {
      name: 'jump-3',
      index: 26,
      bodyIndex: [3, 3],
      sleeveIndex: [3, 3],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, -1],
      hairNudge: [0, -1],
    },
    {
      name: 'jump-4',
      index: 27,
      bodyIndex: [4, 3],
      sleeveIndex: [4, 3],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, -1],
      hairNudge: [0, -1],
    },
    {
      name: 'fall-1',
      index: 28,
      bodyIndex: [5, 3],
      sleeveIndex: [5, 3],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, -1],
      hairNudge: [0, -1],
    },
    {
      name: 'fall-2',
      index: 29,
      bodyIndex: [6, 3],
      sleeveIndex: [6, 3],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, -1],
      hairNudge: [0, -1],
    },
    {
      name: 'fall-3',
      index: 30,
      bodyIndex: [7, 3],
      sleeveIndex: [7, 3],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, -1],
      hairNudge: [0, -1],
    },
    {
      name: 'fall-4',
      index: 31,
      bodyIndex: [8, 3],
      sleeveIndex: [8, 3],
      sleeveNudge: [0, 0],
      chestIndex: [1, 0],
      chestNudge: [0, -1],
      hairNudge: [0, -1],
    },
    {
      name: 'swim-idle',
      index: 32,
      bodyIndex: [1, 5],
      sleeveIndex: [1, 5],
      sleeveNudge: [0, 0],
      chestIndex: [1, 5],
      chestNudge: [0, 0],
      hairNudge: [1, 0],
    },
    {
      name: 'swim-1',
      index: 33,
      bodyIndex: [4, 5],
      sleeveIndex: [4, 5],
      sleeveNudge: [0, 0],
      chestIndex: [1, 5],
      chestNudge: [0, 0],
      hairNudge: [1, 0],
    },
    {
      name: 'swim-2',
      index: 34,
      bodyIndex: [5, 5],
      sleeveIndex: [5, 5],
      sleeveNudge: [0, 0],
      chestIndex: [1, 5],
      chestNudge: [0, 1],
      hairNudge: [1, 1],
    },
    {
      name: 'swim-3',
      index: 35,
      bodyIndex: [6, 5],
      sleeveIndex: [6, 5],
      sleeveNudge: [0, 0],
      chestIndex: [1, 5],
      chestNudge: [0, 2],
      hairNudge: [1, 2],
    },
    {
      name: 'swim-4',
      index: 36,
      bodyIndex: [7, 5],
      sleeveIndex: [7, 5],
      sleeveNudge: [0, 0],
      chestIndex: [1, 5],
      chestNudge: [0, 1],
      hairNudge: [1, 1],
    },
  ] as PoseConfig[],
  animations: {
    [AnimationType.WALK]: {
      frames: ['walk-1', 'walk-2', 'walk-3', 'walk-4', 'walk-5', 'walk-6', 'walk-7', 'walk-8'],
      frameRate: 8,
      repeat: -1,
    },
    [AnimationType.RUN]: {
      frames: ['run-1', 'run-2', 'run-3', 'run-4', 'run-5', 'run-6', 'run-7', 'run-8'],
      frameRate: 12,
      repeat: -1,
    },
    [AnimationType.JUMP]: {
      frames: ['jump-1', 'jump-2', 'jump-3', 'jump-4'],
      frameRate: 12,
      repeat: 0,
    },
    [AnimationType.FALL]: {
      frames: ['fall-1', 'fall-2', 'fall-3', 'fall-4'],
      frameRate: 8,
      repeat: -1,
    },
    [AnimationType.SWIM]: {
      frames: ['swim-1', 'swim-2', 'swim-3', 'swim-4'],
      frameRate: 8,
      repeat: -1,
    },
  } as Record<AnimationType, AnimationFrameConfig>,
});
