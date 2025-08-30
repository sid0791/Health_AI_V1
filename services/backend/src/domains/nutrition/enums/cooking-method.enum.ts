/**
 * Cooking methods with standardized USDA classifications
 * Used for applying cooking transformations and nutrient retention factors
 */
export enum CookingMethod {
  // Raw/No cooking
  RAW = 'raw',

  // Wet heat cooking methods
  BOILED = 'boiled',
  STEAMED = 'steamed',
  PRESSURE_COOKED = 'pressure_cooked',
  POACHED = 'poached',
  BRAISED = 'braised',
  STEWED = 'stewed',

  // Dry heat cooking methods
  BAKED = 'baked',
  ROASTED = 'roasted',
  GRILLED = 'grilled',
  BROILED = 'broiled',
  AIR_FRIED = 'air_fried',

  // Fat-based cooking methods
  FRIED = 'fried',
  DEEP_FRIED = 'deep_fried',
  SAUTEED = 'sauteed',
  STIR_FRIED = 'stir_fried',

  // Other methods
  MICROWAVE = 'microwave',
  FERMENTED = 'fermented',
  DEHYDRATED = 'dehydrated',
}

/**
 * Cooking method categories for applying similar transformation rules
 */
export enum CookingMethodCategory {
  RAW = 'raw',
  WET_HEAT = 'wet_heat',
  DRY_HEAT = 'dry_heat',
  FAT_BASED = 'fat_based',
  SPECIAL = 'special',
}

/**
 * Get the category for a cooking method
 */
export function getCookingMethodCategory(method: CookingMethod): CookingMethodCategory {
  switch (method) {
    case CookingMethod.RAW:
      return CookingMethodCategory.RAW;

    case CookingMethod.BOILED:
    case CookingMethod.STEAMED:
    case CookingMethod.PRESSURE_COOKED:
    case CookingMethod.POACHED:
    case CookingMethod.BRAISED:
    case CookingMethod.STEWED:
      return CookingMethodCategory.WET_HEAT;

    case CookingMethod.BAKED:
    case CookingMethod.ROASTED:
    case CookingMethod.GRILLED:
    case CookingMethod.BROILED:
    case CookingMethod.AIR_FRIED:
      return CookingMethodCategory.DRY_HEAT;

    case CookingMethod.FRIED:
    case CookingMethod.DEEP_FRIED:
    case CookingMethod.SAUTEED:
    case CookingMethod.STIR_FRIED:
      return CookingMethodCategory.FAT_BASED;

    case CookingMethod.MICROWAVE:
    case CookingMethod.FERMENTED:
    case CookingMethod.DEHYDRATED:
      return CookingMethodCategory.SPECIAL;

    default:
      return CookingMethodCategory.RAW;
  }
}
