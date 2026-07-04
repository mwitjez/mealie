import type { ReadPlanEntry } from "~/lib/api/types/meal-plan";

export interface DailyMacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyMacroSummary {
  totals: DailyMacroTotals;
  /** Number of entries that contributed at least one usable macro value. */
  entriesWithData: number;
  /** Total number of entries in the day (including notes and empty recipes). */
  totalEntries: number;
  /** True when at least one entry contributed nutrition. Callers hide the row when false. */
  hasData: boolean;
  /** True when every entry in the day contributed nutrition. */
  isComplete: boolean;
}

/**
 * Parse a free-text nutrition value into a number.
 *
 * Nutrition is stored as free text, so values may be empty, non-numeric, or carry
 * trailing units (e.g. "350", "350.5g"). We parse the leading numeric part
 * (parseFloat-style); anything that does not start with a number contributes
 * nothing and is reported as missing.
 */
export function parseNutritionValue(value?: string | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number.parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Sum calories, protein, carbs, and fat across a day's meal plan entries.
 *
 * Pure and side-effect-free so it can back both the View and Edit tabs identically.
 * Totals are rounded to whole numbers. Entries without a recipe (free-text notes) or
 * without any usable nutrition count toward the "missing data" tally used by the
 * incompleteness indicator.
 */
export function calculateDailyMacros(entries: ReadPlanEntry[]): DailyMacroSummary {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let entriesWithData = 0;

  for (const entry of entries) {
    const nutrition = entry.recipe?.nutrition;
    if (!nutrition) {
      continue;
    }

    const entryCalories = parseNutritionValue(nutrition.calories);
    const entryProtein = parseNutritionValue(nutrition.proteinContent);
    const entryCarbs = parseNutritionValue(nutrition.carbohydrateContent);
    const entryFat = parseNutritionValue(nutrition.fatContent);

    if (entryCalories === null && entryProtein === null && entryCarbs === null && entryFat === null) {
      continue;
    }

    entriesWithData += 1;
    calories += entryCalories ?? 0;
    protein += entryProtein ?? 0;
    carbs += entryCarbs ?? 0;
    fat += entryFat ?? 0;
  }

  const totalEntries = entries.length;

  return {
    totals: {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    },
    entriesWithData,
    totalEntries,
    hasData: entriesWithData > 0,
    isComplete: totalEntries > 0 && entriesWithData === totalEntries,
  };
}
