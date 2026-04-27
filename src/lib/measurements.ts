import { LengthUnit, WeightUnit } from '../types';

export interface MeasurementOption {
  label: string;
  secondaryLabel: string;
  value: number;
}

export const LENGTH_UNIT_OPTIONS = [
  { label: 'cm', value: 'cm' },
  { label: 'ft/in', value: 'in' }
] as const;

export const WEIGHT_UNIT_OPTIONS = [
  { label: 'kg', value: 'kg' },
  { label: 'lb', value: 'lb' }
] as const;

export const HEIGHT_RANGE_CM = {
  min: 155,
  max: 231
} as const;

export const WINGSPAN_RANGE_CM = {
  min: 160,
  max: 244
} as const;

export const WEIGHT_RANGE_KG = {
  min: 55,
  max: 140
} as const;

export const DEFAULT_HEIGHT_CM = 182.88;
export const DEFAULT_WINGSPAN_CM = 193.04;
export const DEFAULT_WEIGHT_KG = 83.91;

const CENTIMETERS_PER_INCH = 2.54;
const POUNDS_PER_KILOGRAM = 2.20462;

const createRange = (min: number, max: number) =>
  Array.from({ length: max - min + 1 }, (_, index) => min + index);

export const normalizeLengthUnit = (value?: string | null): LengthUnit =>
  value === 'in' ? 'in' : 'cm';

export const normalizeWeightUnit = (value?: string | null): WeightUnit =>
  value === 'lb' ? 'lb' : 'kg';

export const inchesToCm = (value: number) =>
  Number((value * CENTIMETERS_PER_INCH).toFixed(2));

export const cmToInches = (value: number) => value / CENTIMETERS_PER_INCH;

export const poundsToKg = (value: number) =>
  Number((value / POUNDS_PER_KILOGRAM).toFixed(2));

export const kgToPounds = (value: number) => value * POUNDS_PER_KILOGRAM;

export const formatFeetAndInches = (value: number) => {
  const roundedInches = Math.max(0, Math.round(value));
  const feet = Math.floor(roundedInches / 12);
  const inches = roundedInches % 12;

  return `${feet}'${inches}"`;
};

export const formatLengthMeasurement = (valueCm: number, unit: LengthUnit) =>
  unit === 'cm'
    ? `${Math.round(valueCm)} cm`
    : formatFeetAndInches(cmToInches(valueCm));

export const formatWeightMeasurement = (valueKg: number, unit: WeightUnit) =>
  unit === 'kg'
    ? `${Math.round(valueKg)} kg`
    : `${Math.round(kgToPounds(valueKg))} lb`;

export const buildLengthOptions = (
  unit: LengthUnit,
  range: { min: number; max: number }
): MeasurementOption[] => {
  if (unit === 'cm') {
    return createRange(range.min, range.max).map((valueCm) => ({
      label: `${valueCm} cm`,
      secondaryLabel: '',
      value: valueCm
    }));
  }

  const minInches = Math.round(cmToInches(range.min));
  const maxInches = Math.round(cmToInches(range.max));

  return createRange(minInches, maxInches).map((valueInches) => {
    const valueCm = inchesToCm(valueInches);

    return {
      label: formatFeetAndInches(valueInches),
      secondaryLabel: '',
      value: valueCm
    };
  });
};

export const buildWeightOptions = (
  unit: WeightUnit,
  range: { min: number; max: number }
): MeasurementOption[] => {
  if (unit === 'kg') {
    return createRange(range.min, range.max).map((valueKg) => ({
      label: `${valueKg} kg`,
      secondaryLabel: '',
      value: valueKg
    }));
  }

  const minPounds = Math.round(kgToPounds(range.min));
  const maxPounds = Math.round(kgToPounds(range.max));

  return createRange(minPounds, maxPounds).map((valuePounds) => {
    const valueKg = poundsToKg(valuePounds);

    return {
      label: `${valuePounds} lb`,
      secondaryLabel: '',
      value: valueKg
    };
  });
};

export const findClosestMeasurementIndex = (
  options: readonly MeasurementOption[],
  targetValue: number
) => {
  if (!options.length) {
    return 0;
  }

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  options.forEach((option, index) => {
    const distance = Math.abs(option.value - targetValue);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
};

export const inferLengthUnit = (value?: string | null): LengthUnit => {
  if (!value) {
    return 'cm';
  }

  return /'|ft|feet|in\b|"/i.test(value) ? 'in' : 'cm';
};

export const inferWeightUnit = (value?: string | null): WeightUnit => {
  if (!value) {
    return 'kg';
  }

  return /lb|lbs|pound/i.test(value) ? 'lb' : 'kg';
};

export const parseLengthMeasurement = (
  value: string | null | undefined,
  fallbackValueCm: number
) => {
  if (!value) {
    return fallbackValueCm;
  }

  const trimmedValue = value.trim();
  const feetAndInchesMatch = trimmedValue.match(/(\d+)\s*'\s*(\d+)?\s*(?:"|in)?/i);

  if (feetAndInchesMatch) {
    const feet = Number(feetAndInchesMatch[1]);
    const inches = Number(feetAndInchesMatch[2] ?? 0);

    return inchesToCm(feet * 12 + inches);
  }

  const centimetersMatch = trimmedValue.match(/(\d+(?:\.\d+)?)\s*cm/i);

  if (centimetersMatch) {
    return Number(centimetersMatch[1]);
  }

  const inchesMatch = trimmedValue.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|inches)\b/i);

  if (inchesMatch) {
    return inchesToCm(Number(inchesMatch[1]));
  }

  const numericValue = Number(trimmedValue);

  if (!Number.isNaN(numericValue)) {
    return numericValue > 120 ? numericValue : inchesToCm(numericValue);
  }

  return fallbackValueCm;
};

export const parseWeightMeasurement = (
  value: string | null | undefined,
  fallbackValueKg: number
) => {
  if (!value) {
    return fallbackValueKg;
  }

  const trimmedValue = value.trim();
  const kilogramsMatch = trimmedValue.match(/(\d+(?:\.\d+)?)\s*kg/i);

  if (kilogramsMatch) {
    return Number(kilogramsMatch[1]);
  }

  const poundsMatch = trimmedValue.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)\b/i);

  if (poundsMatch) {
    return poundsToKg(Number(poundsMatch[1]));
  }

  const numericValue = Number(trimmedValue);

  if (!Number.isNaN(numericValue)) {
    return numericValue > 140 ? poundsToKg(numericValue) : numericValue;
  }

  return fallbackValueKg;
};

export const createDefaultMeasurements = () => ({
  heightCm: DEFAULT_HEIGHT_CM,
  heightUnit: 'cm' as const,
  wingspanCm: DEFAULT_WINGSPAN_CM,
  wingspanUnit: 'cm' as const,
  weightKg: DEFAULT_WEIGHT_KG,
  weightUnit: 'kg' as const
});
