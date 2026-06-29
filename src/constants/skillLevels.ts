export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

const SKILL_LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Gemiddeld',
  advanced: 'Gevorderd',
};

/** Geeft het Nederlandse label voor een skill level (valt terug op de oorspronkelijke waarde). */
export function skillLevelLabel(level?: string | null): string {
  if (!level) return 'Beginner';
  return SKILL_LEVEL_LABELS[level] ?? level;
}
