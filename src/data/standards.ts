import type { StandardKey } from '@/db/types'

export const LEVELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'] as const
export type Level = (typeof LEVELS)[number]

/** Bodyweight breakpoints (lb) shared by all male base tables. */
export const BW_BREAKPOINTS_LB = [110, 130, 150, 170, 190, 210, 230, 250, 270, 300]

/**
 * 1RM thresholds in lb for each level at each bodyweight breakpoint.
 * Rows follow BW_BREAKPOINTS_LB. Values are population estimates drawn from
 * widely published strength-standard tables; treat as a guide, not a verdict.
 */
type Table = number[][]

const MALE_BASE: Record<'squat' | 'bench' | 'deadlift' | 'ohp' | 'row' | 'pullup' | 'dip', Table> = {
  squat: [
    [70, 115, 175, 245, 320], [95, 145, 215, 295, 375], [115, 175, 250, 335, 420], [135, 200, 280, 370, 460],
    [150, 220, 305, 400, 495], [165, 240, 330, 430, 525], [180, 255, 350, 450, 555], [190, 270, 365, 470, 575],
    [200, 280, 380, 490, 595], [210, 295, 400, 510, 620],
  ],
  bench: [
    [55, 85, 125, 175, 230], [70, 105, 150, 205, 265], [85, 125, 175, 235, 300], [100, 140, 195, 260, 325],
    [110, 155, 215, 280, 350], [120, 165, 230, 300, 370], [130, 180, 245, 315, 390], [135, 190, 255, 330, 405],
    [140, 195, 265, 340, 420], [150, 205, 280, 355, 435],
  ],
  deadlift: [
    [90, 145, 215, 295, 380], [120, 185, 260, 350, 440], [145, 215, 300, 395, 495], [165, 245, 335, 435, 540],
    [185, 270, 365, 470, 580], [200, 290, 390, 500, 615], [215, 310, 415, 525, 645], [230, 325, 435, 550, 670],
    [240, 340, 455, 570, 695], [255, 360, 480, 600, 725],
  ],
  ohp: [
    [35, 55, 85, 120, 160], [45, 70, 100, 140, 180], [55, 80, 115, 155, 200], [65, 95, 130, 170, 220],
    [70, 105, 140, 185, 235], [80, 110, 150, 195, 250], [85, 120, 160, 210, 265], [90, 125, 170, 220, 275],
    [95, 130, 175, 230, 285], [100, 140, 185, 240, 300],
  ],
  row: [
    [50, 80, 120, 170, 225], [65, 100, 145, 200, 255], [80, 120, 165, 225, 285], [90, 135, 185, 245, 310],
    [100, 150, 200, 265, 335], [110, 160, 215, 285, 355], [120, 170, 230, 300, 370], [125, 180, 240, 315, 385],
    [130, 185, 250, 325, 400], [140, 195, 265, 340, 415],
  ],
  // Added weight (lb) for weighted bodyweight lifts; 0 = bodyweight only.
  pullup: [
    [0, 20, 55, 100, 150], [0, 25, 60, 110, 160], [0, 30, 70, 120, 170], [0, 30, 75, 125, 180],
    [0, 35, 80, 130, 185], [0, 35, 80, 130, 185], [0, 35, 85, 135, 190], [0, 35, 85, 135, 190],
    [0, 35, 85, 135, 190], [0, 35, 85, 135, 190],
  ],
  dip: [
    [0, 25, 65, 115, 170], [0, 30, 75, 130, 185], [0, 35, 85, 145, 205], [0, 40, 90, 150, 215],
    [0, 40, 95, 160, 225], [0, 45, 95, 160, 230], [0, 45, 100, 165, 235], [0, 45, 100, 170, 240],
    [0, 45, 100, 170, 240], [0, 45, 100, 170, 240],
  ],
}

/** Derived lifts as a fraction of a base lift. */
const DERIVED: Partial<Record<StandardKey, { base: keyof typeof MALE_BASE; factor: number }>> = {
  front_squat: { base: 'squat', factor: 0.8 },
  incline_bench: { base: 'bench', factor: 0.85 },
  rdl: { base: 'deadlift', factor: 0.8 },
}

/** Female thresholds as a fraction of the male table at the same bodyweight. */
const FEMALE_FACTOR: Record<keyof typeof MALE_BASE, number> = {
  squat: 0.65, bench: 0.52, deadlift: 0.68, ohp: 0.55, row: 0.6, pullup: 0.5, dip: 0.5,
}

export const STANDARD_LABELS: Record<StandardKey, string> = {
  squat: 'Squat', bench: 'Bench Press', deadlift: 'Deadlift', ohp: 'Overhead Press', row: 'Barbell Row',
  front_squat: 'Front Squat', incline_bench: 'Incline Bench', rdl: 'Romanian Deadlift',
  pullup: 'Weighted Pull-Up', dip: 'Weighted Dip',
}
export const STANDARD_KEYS = Object.keys(STANDARD_LABELS) as StandardKey[]

export function getTable(key: StandardKey, sex: 'male' | 'female'): Table {
  const derived = DERIVED[key]
  const baseKey = (derived ? derived.base : key) as keyof typeof MALE_BASE
  const factor = (derived ? derived.factor : 1) * (sex === 'female' ? FEMALE_FACTOR[baseKey] : 1)
  return MALE_BASE[baseKey].map((row) => row.map((v) => Math.round(v * factor)))
}
