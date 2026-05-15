export enum CategorySource {
  AI = 'AI',
  AI_OVERRIDDEN = 'AI_OVERRIDDEN',
  USER = 'USER',
}

// Derive the source from the AI suggestion + the final category chosen.
// suggestedCategoryId == null && aiConfidence == null → USER (no AI involved)
// suggestedCategoryId === finalCategoryId             → AI (suggestion accepted)
// suggestedCategoryId !== finalCategoryId             → AI_OVERRIDDEN (user changed it)
export function deriveCategorySource(params: {
  suggestedCategoryId: string | null | undefined;
  finalCategoryId: string;
}): CategorySource {
  if (!params.suggestedCategoryId) return CategorySource.USER;
  return params.suggestedCategoryId === params.finalCategoryId
    ? CategorySource.AI
    : CategorySource.AI_OVERRIDDEN;
}
