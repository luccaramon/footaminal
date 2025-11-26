export type Vector2 = {
  x: number;
  y: number;
};

export type Entity = {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  mass: number;
  damping: number;
};

export enum AnimalType {
  LION = '🦁',
  TIGER = '🐯',
  PANDA = '🐼',
  FOX = '🦊',
  BEAR = '🐻',
  KOALA = '🐨'
}

export type Player = Entity & {
  id: string;
  emoji: AnimalType;
  team: 'red' | 'blue';
  isHuman: boolean;
  speed: number;
  kickPower: number;
};

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GOAL_SCORED = 'GOAL_SCORED',
  FINISHED = 'FINISHED'
}

export type GameEvent = {
  type: 'goal' | 'start' | 'end' | 'save';
  team?: 'red' | 'blue';
  animal?: AnimalType;
  timestamp: number;
};
