import { AnimalType } from './types';

// Field Dimensions (Internal Resolution)
export const FIELD_WIDTH = 800;
export const FIELD_HEIGHT = 500;
export const GOAL_WIDTH = 120;
export const GOAL_DEPTH = 40;

// Physics
export const BALL_RADIUS = 10;
export const PLAYER_RADIUS = 25;
export const MAX_SPEED = 6;
export const FRICTION = 0.94;
export const BALL_FRICTION = 0.98;

// Game
export const MATCH_DURATION_SECONDS = 120;

export const ANIMALS = [
  { type: AnimalType.LION, name: 'Lion', speed: 6, kick: 12 },
  { type: AnimalType.TIGER, name: 'Tiger', speed: 6.5, kick: 11 },
  { type: AnimalType.BEAR, name: 'Bear', speed: 4.5, kick: 15 },
  { type: AnimalType.PANDA, name: 'Panda', speed: 5, kick: 13 },
  { type: AnimalType.FOX, name: 'Fox', speed: 7.5, kick: 9 },
  { type: AnimalType.KOALA, name: 'Koala', speed: 5.5, kick: 10 },
];
