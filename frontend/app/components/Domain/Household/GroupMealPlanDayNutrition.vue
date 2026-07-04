<template>
  <div
    v-if="summary.hasData"
    class="d-flex align-center flex-wrap text-caption text-medium-emphasis"
    :aria-label="i18n.t('meal-plan.daily-nutrition-summary')"
  >
    <span class="mr-1">{{ summaryText }}</span>
    <v-tooltip v-if="!summary.isComplete" location="top">
      <template #activator="{ props: tooltipProps }">
        <v-icon
          v-bind="tooltipProps"
          size="x-small"
          class="mb-1"
          :aria-label="incompleteTooltip"
        >
          {{ $globals.icons.alertOutline }}
        </v-icon>
      </template>
      <span>{{ incompleteTooltip }}</span>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import type { ReadPlanEntry } from "~/lib/api/types/meal-plan";
import { calculateDailyMacros } from "~/composables/use-mealplan-nutrition";

const props = defineProps<{
  entries: ReadPlanEntry[];
}>();

const i18n = useI18n();
const { $globals } = useNuxtApp();

const summary = computed(() => calculateDailyMacros(props.entries));

const summaryText = computed(() => i18n.t("meal-plan.nutrition-summary", summary.value.totals));

const incompleteTooltip = computed(() =>
  i18n.t("meal-plan.nutrition-incomplete-tooltip", {
    count: summary.value.entriesWithData,
    total: summary.value.totalEntries,
  }),
);
</script>
