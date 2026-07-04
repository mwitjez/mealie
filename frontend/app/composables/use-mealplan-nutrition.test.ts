import { describe, expect, test } from "vitest";
import { calculateDailyMacros, parseNutritionValue } from "./use-mealplan-nutrition";
import type { Nutrition } from "~/lib/api/types/recipe";
import type { ReadPlanEntry } from "~/lib/api/types/meal-plan";

function recipeEntry(nutrition: Partial<Nutrition>): ReadPlanEntry {
  return { recipe: { nutrition } } as unknown as ReadPlanEntry;
}

function recipeEntryWithoutNutrition(): ReadPlanEntry {
  return { recipe: { nutrition: null } } as unknown as ReadPlanEntry;
}

function noteEntry(): ReadPlanEntry {
  return { recipe: null } as unknown as ReadPlanEntry;
}

describe("parseNutritionValue", () => {
  test("parses a plain integer string", () => {
    expect(parseNutritionValue("350")).toBe(350);
  });

  test("parses a decimal string", () => {
    expect(parseNutritionValue("350.5")).toBe(350.5);
  });

  test("parses the leading numeric part", () => {
    expect(parseNutritionValue("350.5g")).toBe(350.5);
  });

  test("returns null for a leading non-numeric string", () => {
    expect(parseNutritionValue("~350")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseNutritionValue("")).toBeNull();
  });

  test("returns null for null/undefined", () => {
    expect(parseNutritionValue(null)).toBeNull();
    expect(parseNutritionValue(undefined)).toBeNull();
  });
});

describe("calculateDailyMacros", () => {
  test("sums calories and macros across multiple entries", () => {
    const summary = calculateDailyMacros([
      recipeEntry({ calories: "350", proteinContent: "20", carbohydrateContent: "40", fatContent: "10" }),
      recipeEntry({ calories: "500", proteinContent: "30", carbohydrateContent: "50", fatContent: "20" }),
    ]);

    expect(summary.totals).toEqual({ calories: 850, protein: 50, carbs: 90, fat: 30 });
    expect(summary.entriesWithData).toBe(2);
    expect(summary.totalEntries).toBe(2);
    expect(summary.hasData).toBe(true);
    expect(summary.isComplete).toBe(true);
  });

  test("rounds each total to a whole number", () => {
    const summary = calculateDailyMacros([
      recipeEntry({ calories: "350.4", proteinContent: "20.5", carbohydrateContent: "40.6", fatContent: "10.5" }),
      recipeEntry({ calories: "0.4", proteinContent: "0.1", carbohydrateContent: "0.1", fatContent: "0.1" }),
    ]);

    expect(summary.totals).toEqual({ calories: 351, protein: 21, carbs: 41, fat: 11 });
  });

  test("parses messy strings tolerantly and treats junk as no contribution", () => {
    const summary = calculateDailyMacros([
      recipeEntry({ calories: "~350", proteinContent: "20", carbohydrateContent: "", fatContent: "10.5" }),
    ]);

    // "~350" -> junk (0), "" -> nothing (0), "20" -> 20, "10.5" -> 11 (rounded)
    expect(summary.totals).toEqual({ calories: 0, protein: 20, carbs: 0, fat: 11 });
    // The entry still has some usable nutrition, so it counts as "with data".
    expect(summary.entriesWithData).toBe(1);
    expect(summary.hasData).toBe(true);
  });

  test("skips free-text note entries with no recipe", () => {
    const summary = calculateDailyMacros([
      recipeEntry({ calories: "350", proteinContent: "20", carbohydrateContent: "40", fatContent: "10" }),
      noteEntry(),
    ]);

    expect(summary.totals).toEqual({ calories: 350, protein: 20, carbs: 40, fat: 10 });
    expect(summary.entriesWithData).toBe(1);
    expect(summary.totalEntries).toBe(2);
    expect(summary.hasData).toBe(true);
    expect(summary.isComplete).toBe(false);
  });

  test("reports partial data counts for the incompleteness indicator", () => {
    const summary = calculateDailyMacros([
      recipeEntry({ calories: "350", proteinContent: "20", carbohydrateContent: "40", fatContent: "10" }),
      recipeEntryWithoutNutrition(),
      recipeEntry({ calories: "not-a-number", proteinContent: "junk", carbohydrateContent: "", fatContent: "" }),
      noteEntry(),
    ]);

    expect(summary.entriesWithData).toBe(1);
    expect(summary.totalEntries).toBe(4);
    expect(summary.hasData).toBe(true);
    expect(summary.isComplete).toBe(false);
  });

  test("returns an empty/zero result when a day has no nutrition data at all", () => {
    const summary = calculateDailyMacros([
      noteEntry(),
      recipeEntryWithoutNutrition(),
    ]);

    expect(summary.totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    expect(summary.entriesWithData).toBe(0);
    expect(summary.totalEntries).toBe(2);
    expect(summary.hasData).toBe(false);
    expect(summary.isComplete).toBe(false);
  });

  test("returns a zero result and no data for an empty day", () => {
    const summary = calculateDailyMacros([]);

    expect(summary.totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    expect(summary.entriesWithData).toBe(0);
    expect(summary.totalEntries).toBe(0);
    expect(summary.hasData).toBe(false);
    expect(summary.isComplete).toBe(false);
  });
});
