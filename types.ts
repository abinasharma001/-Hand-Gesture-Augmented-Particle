export enum ShapeType {
  SPHERE = 'Sphere',
  HEART = 'Heart',
  FLOWER = 'Flower',
  SATURN = 'Saturn',
  BUDDHA = 'Buddha',
  FIREWORKS = 'Fireworks',
  JAGANNATH = 'Jagannath',
  BOW = 'Bow & Arrow',
  TEXT_ABINASH = 'Abinash',
  TEXT_AS = 'A & S'
}

export interface AppState {
  particleCount: number;
  particleSize: number;
  noiseStrength: number;
  color: string;
  shape: ShapeType;
  useCamera: boolean;
  gestureOpen: number; // 0 (closed) to 1 (open)
  gestureDistance: number; // Normalized distance
  fingerCount: number; // New: Number of fingers detected
  isExploding: boolean; // For fireworks/destruction
}

export const THEMES = {
  [ShapeType.SPHERE]: '#3b82f6',
  [ShapeType.HEART]: '#ef4444',
  [ShapeType.FLOWER]: '#d946ef',
  [ShapeType.SATURN]: '#f59e0b',
  [ShapeType.BUDDHA]: '#10b981',
  [ShapeType.FIREWORKS]: '#ffffff',
  [ShapeType.JAGANNATH]: '#000000', // Black/Multi (handled in shader usually, but base color here)
  [ShapeType.BOW]: '#8b5cf6',
  [ShapeType.TEXT_ABINASH]: '#0ea5e9',
  [ShapeType.TEXT_AS]: '#f43f5e'
};