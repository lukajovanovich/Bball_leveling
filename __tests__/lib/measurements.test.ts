import {
  DEFAULT_HEIGHT_CM,
  DEFAULT_WEIGHT_KG,
  DEFAULT_WINGSPAN_CM,
  HEIGHT_RANGE_CM,
  LENGTH_UNIT_OPTIONS,
  WEIGHT_RANGE_KG,
  WEIGHT_UNIT_OPTIONS,
  WINGSPAN_RANGE_CM,
  buildLengthOptions,
  buildWeightOptions,
  cmToInches,
  createDefaultMeasurements,
  findClosestMeasurementIndex,
  formatFeetAndInches,
  formatLengthMeasurement,
  formatWeightMeasurement,
  inchesToCm,
  inferLengthUnit,
  inferWeightUnit,
  kgToPounds,
  normalizeLengthUnit,
  normalizeWeightUnit,
  parseLengthMeasurement,
  parseWeightMeasurement,
  poundsToKg
} from '../../src/lib/measurements';

describe('unit conversion', () => {
  it('converts inches and centimeters both ways', () => {
    expect(inchesToCm(72)).toBe(182.88);
    expect(inchesToCm(0)).toBe(0);
    expect(cmToInches(182.88)).toBeCloseTo(72, 6);
    expect(cmToInches(inchesToCm(77))).toBeCloseTo(77, 2);
  });

  it('converts pounds and kilograms both ways', () => {
    expect(poundsToKg(185)).toBe(83.91);
    expect(kgToPounds(100)).toBeCloseTo(220.462, 3);
    expect(kgToPounds(poundsToKg(210))).toBeCloseTo(210, 1);
  });
});

describe('normalize units', () => {
  it('falls back to metric for anything unknown', () => {
    expect(normalizeLengthUnit('in')).toBe('in');
    expect(normalizeLengthUnit('cm')).toBe('cm');
    expect(normalizeLengthUnit('ft')).toBe('cm');
    expect(normalizeLengthUnit(undefined)).toBe('cm');
    expect(normalizeLengthUnit(null)).toBe('cm');

    expect(normalizeWeightUnit('lb')).toBe('lb');
    expect(normalizeWeightUnit('kg')).toBe('kg');
    expect(normalizeWeightUnit('stone')).toBe('kg');
    expect(normalizeWeightUnit(null)).toBe('kg');
  });
});

describe('formatting', () => {
  it('formats feet and inches', () => {
    expect(formatFeetAndInches(72)).toBe('6\'0"');
    expect(formatFeetAndInches(74)).toBe('6\'2"');
    expect(formatFeetAndInches(83)).toBe('6\'11"');
    expect(formatFeetAndInches(0)).toBe('0\'0"');
  });

  it('rolls 11.5+ inches over into the next foot instead of showing 12 inches', () => {
    expect(formatFeetAndInches(71.5)).toBe('6\'0"');
    expect(formatFeetAndInches(71.4)).toBe('5\'11"');
  });

  it('never shows negative lengths', () => {
    expect(formatFeetAndInches(-5)).toBe('0\'0"');
  });

  it('formats lengths in the chosen unit', () => {
    expect(formatLengthMeasurement(182.88, 'cm')).toBe('183 cm');
    expect(formatLengthMeasurement(182.88, 'in')).toBe('6\'0"');
    expect(formatLengthMeasurement(200, 'in')).toBe('6\'7"');
  });

  it('formats weights in the chosen unit', () => {
    expect(formatWeightMeasurement(83.91, 'kg')).toBe('84 kg');
    expect(formatWeightMeasurement(83.91, 'lb')).toBe('185 lb');
    expect(formatWeightMeasurement(100, 'lb')).toBe('220 lb');
  });
});

describe('picker options', () => {
  it('offers every centimeter in the height range', () => {
    const options = buildLengthOptions('cm', HEIGHT_RANGE_CM);

    expect(options).toHaveLength(HEIGHT_RANGE_CM.max - HEIGHT_RANGE_CM.min + 1);
    expect(options[0]).toEqual({ label: '155 cm', secondaryLabel: '', value: 155 });
    expect(options[options.length - 1].value).toBe(231);
  });

  it('offers every inch in the height range, stored as centimeters', () => {
    const options = buildLengthOptions('in', HEIGHT_RANGE_CM);

    expect(options[0].label).toBe('5\'1"');
    expect(options[0].value).toBe(inchesToCm(61));
    expect(options[options.length - 1].label).toBe('7\'7"');
    expect(options).toHaveLength(91 - 61 + 1);
  });

  it('offers kilograms and pounds across the weight range', () => {
    const kg = buildWeightOptions('kg', WEIGHT_RANGE_KG);
    const lb = buildWeightOptions('lb', WEIGHT_RANGE_KG);

    expect(kg).toHaveLength(86);
    expect(kg[0].label).toBe('55 kg');
    expect(kg[kg.length - 1].label).toBe('140 kg');
    expect(lb[0].label).toBe('121 lb');
    expect(lb[lb.length - 1].label).toBe('309 lb');
  });

  const optionSets = [
    ['height cm', buildLengthOptions('cm', HEIGHT_RANGE_CM)],
    ['height in', buildLengthOptions('in', HEIGHT_RANGE_CM)],
    ['wingspan cm', buildLengthOptions('cm', WINGSPAN_RANGE_CM)],
    ['wingspan in', buildLengthOptions('in', WINGSPAN_RANGE_CM)],
    ['weight kg', buildWeightOptions('kg', WEIGHT_RANGE_KG)],
    ['weight lb', buildWeightOptions('lb', WEIGHT_RANGE_KG)]
  ] as const;

  it.each(optionSets)('%s options are ascending with unique values', (_, options) => {
    const values = options.map((option) => option.value);

    expect(new Set(values).size).toBe(values.length);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(options.length).toBeGreaterThan(0);
  });

  it('labels every imperial length option exactly as the app displays the stored value', () => {
    [HEIGHT_RANGE_CM, WINGSPAN_RANGE_CM].forEach((range) => {
      buildLengthOptions('in', range).forEach((option) => {
        expect(formatLengthMeasurement(option.value, 'in')).toBe(option.label);
      });
      buildLengthOptions('cm', range).forEach((option) => {
        expect(formatLengthMeasurement(option.value, 'cm')).toBe(option.label);
      });
    });
  });

  it('labels every weight option exactly as the app displays the stored value', () => {
    buildWeightOptions('lb', WEIGHT_RANGE_KG).forEach((option) => {
      expect(formatWeightMeasurement(option.value, 'lb')).toBe(option.label);
    });
    buildWeightOptions('kg', WEIGHT_RANGE_KG).forEach((option) => {
      expect(formatWeightMeasurement(option.value, 'kg')).toBe(option.label);
    });
  });

  it('exposes both unit choices for the switch', () => {
    expect(LENGTH_UNIT_OPTIONS.map((option) => option.value)).toEqual(['cm', 'in']);
    expect(WEIGHT_UNIT_OPTIONS.map((option) => option.value)).toEqual(['kg', 'lb']);
  });
});

describe('findClosestMeasurementIndex', () => {
  const options = buildLengthOptions('cm', HEIGHT_RANGE_CM);

  it('returns 0 for an empty list', () => {
    expect(findClosestMeasurementIndex([], 180)).toBe(0);
  });

  it('finds exact and nearest values', () => {
    expect(findClosestMeasurementIndex(options, 155)).toBe(0);
    expect(findClosestMeasurementIndex(options, 180)).toBe(25);
    expect(findClosestMeasurementIndex(options, 182.88)).toBe(28);
    expect(findClosestMeasurementIndex(options, 182.2)).toBe(27);
  });

  it('clamps values outside the range to the ends', () => {
    expect(findClosestMeasurementIndex(options, 10)).toBe(0);
    expect(findClosestMeasurementIndex(options, 999)).toBe(options.length - 1);
  });

  it('keeps the same displayed value when switching units', () => {
    const inchOptions = buildLengthOptions('in', HEIGHT_RANGE_CM);
    const index = findClosestMeasurementIndex(inchOptions, DEFAULT_HEIGHT_CM);

    expect(inchOptions[index].label).toBe(
      formatLengthMeasurement(DEFAULT_HEIGHT_CM, 'in')
    );
  });
});

describe('infer units from legacy text', () => {
  it('detects imperial lengths', () => {
    expect(inferLengthUnit('6\'2"')).toBe('in');
    expect(inferLengthUnit('6 ft 2')).toBe('in');
    expect(inferLengthUnit('74 in')).toBe('in');
    expect(inferLengthUnit('188 cm')).toBe('cm');
    expect(inferLengthUnit('188')).toBe('cm');
    expect(inferLengthUnit(undefined)).toBe('cm');
    expect(inferLengthUnit('')).toBe('cm');
  });

  it('detects imperial weights', () => {
    expect(inferWeightUnit('185 lbs')).toBe('lb');
    expect(inferWeightUnit('185 pounds')).toBe('lb');
    expect(inferWeightUnit('84 kg')).toBe('kg');
    expect(inferWeightUnit('84')).toBe('kg');
    expect(inferWeightUnit(null)).toBe('kg');
  });
});

describe('parseLengthMeasurement', () => {
  const fallback = 180;

  it('uses the fallback when there is nothing to parse', () => {
    expect(parseLengthMeasurement(undefined, fallback)).toBe(fallback);
    expect(parseLengthMeasurement(null, fallback)).toBe(fallback);
    expect(parseLengthMeasurement('', fallback)).toBe(fallback);
    expect(parseLengthMeasurement('tall', fallback)).toBe(fallback);
  });

  it('uses the fallback for whitespace instead of returning zero', () => {
    expect(parseLengthMeasurement('   ', fallback)).toBe(fallback);
  });

  it('parses feet and inches', () => {
    expect(parseLengthMeasurement('6\'2"', fallback)).toBe(187.96);
    expect(parseLengthMeasurement('6\' 2', fallback)).toBe(187.96);
    expect(parseLengthMeasurement('6\'', fallback)).toBe(182.88);
    expect(parseLengthMeasurement(' 5\'11" ', fallback)).toBe(180.34);
  });

  it('parses explicit centimeters and inches', () => {
    expect(parseLengthMeasurement('188 cm', fallback)).toBe(188);
    expect(parseLengthMeasurement('188.5cm', fallback)).toBe(188.5);
    expect(parseLengthMeasurement('74 in', fallback)).toBe(187.96);
    expect(parseLengthMeasurement('74 inches', fallback)).toBe(187.96);
  });

  it('guesses the unit of a bare number from its size', () => {
    expect(parseLengthMeasurement('190', fallback)).toBe(190);
    expect(parseLengthMeasurement('74', fallback)).toBe(187.96);
  });
});

describe('parseWeightMeasurement', () => {
  const fallback = 80;

  it('uses the fallback when there is nothing to parse', () => {
    expect(parseWeightMeasurement(undefined, fallback)).toBe(fallback);
    expect(parseWeightMeasurement(null, fallback)).toBe(fallback);
    expect(parseWeightMeasurement('', fallback)).toBe(fallback);
    expect(parseWeightMeasurement('heavy', fallback)).toBe(fallback);
  });

  it('uses the fallback for whitespace instead of returning zero', () => {
    expect(parseWeightMeasurement('  ', fallback)).toBe(fallback);
  });

  it('parses kilograms and pounds', () => {
    expect(parseWeightMeasurement('85 kg', fallback)).toBe(85);
    expect(parseWeightMeasurement('85.5kg', fallback)).toBe(85.5);
    expect(parseWeightMeasurement('185 lbs', fallback)).toBe(83.91);
    expect(parseWeightMeasurement('185 lb', fallback)).toBe(83.91);
    expect(parseWeightMeasurement('185 pounds', fallback)).toBe(83.91);
  });

  it('guesses the unit of a bare number from its size', () => {
    expect(parseWeightMeasurement('80', fallback)).toBe(80);
    expect(parseWeightMeasurement('200', fallback)).toBe(poundsToKg(200));
  });
});

describe('createDefaultMeasurements', () => {
  it('starts in metric with values inside every picker range', () => {
    const defaults = createDefaultMeasurements();

    expect(defaults).toEqual({
      heightCm: DEFAULT_HEIGHT_CM,
      heightUnit: 'cm',
      wingspanCm: DEFAULT_WINGSPAN_CM,
      wingspanUnit: 'cm',
      weightKg: DEFAULT_WEIGHT_KG,
      weightUnit: 'kg'
    });
    expect(defaults.heightCm).toBeGreaterThanOrEqual(HEIGHT_RANGE_CM.min);
    expect(defaults.heightCm).toBeLessThanOrEqual(HEIGHT_RANGE_CM.max);
    expect(defaults.wingspanCm).toBeGreaterThanOrEqual(WINGSPAN_RANGE_CM.min);
    expect(defaults.wingspanCm).toBeLessThanOrEqual(WINGSPAN_RANGE_CM.max);
    expect(defaults.weightKg).toBeGreaterThanOrEqual(WEIGHT_RANGE_KG.min);
    expect(defaults.weightKg).toBeLessThanOrEqual(WEIGHT_RANGE_KG.max);
  });

  it('returns a fresh object each time', () => {
    expect(createDefaultMeasurements()).not.toBe(createDefaultMeasurements());
  });
});
