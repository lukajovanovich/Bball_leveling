import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MeasurementPicker } from '../../src/components/ui/MeasurementPicker';
import {
  HEIGHT_RANGE_CM,
  LENGTH_UNIT_OPTIONS,
  buildLengthOptions,
  formatLengthMeasurement
} from '../../src/lib/measurements';
import { LengthUnit } from '../../src/types';

const OPTION_HEIGHT = 58;

const setup = async (initialCm = 160, initialUnit: LengthUnit = 'cm') => {
  const onValueChange = jest.fn();
  const onUnitChange = jest.fn();

  const Harness = () => {
    const [valueCm, setValueCm] = useState(initialCm);
    const [unit, setUnit] = useState<LengthUnit>(initialUnit);

    return (
      <MeasurementPicker
        label="Height"
        helperText="Scroll to choose your height."
        valueLabel={formatLengthMeasurement(valueCm, unit)}
        selectedUnit={unit}
        unitOptions={LENGTH_UNIT_OPTIONS}
        onUnitChange={(next) => {
          onUnitChange(next);
          setUnit(next as LengthUnit);
        }}
        options={buildLengthOptions(unit, HEIGHT_RANGE_CM)}
        selectedValue={valueCm}
        onValueChange={(next) => {
          onValueChange(next);
          setValueCm(next);
        }}
      />
    );
  };

  await render(<Harness />);

  return { onValueChange, onUnitChange };
};

const openPicker = async () => {
  await fireEvent.press(screen.getByText('Tap to edit'));
};

describe('MeasurementPicker', () => {
  it('shows the label and current value while closed', async () => {
    await setup();

    expect(screen.getByText('Height')).toBeOnTheScreen();
    expect(screen.getByText('160 cm')).toBeOnTheScreen();
    expect(screen.queryByText('Done')).not.toBeOnTheScreen();
    expect(screen.queryByText('Scroll to choose your height.')).not.toBeOnTheScreen();
  });

  it('opens with helper text, unit switch and options', async () => {
    await setup();
    await openPicker();

    expect(screen.getByText('Scroll to choose your height.')).toBeOnTheScreen();
    expect(screen.getByText('Done')).toBeOnTheScreen();
    expect(screen.getByText('cm')).toBeOnTheScreen();
    expect(screen.getByText('ft/in')).toBeOnTheScreen();
    expect(screen.getByText('155 cm')).toBeOnTheScreen();
    expect(screen.getByText('156 cm')).toBeOnTheScreen();
  });

  it('closes with Done without changing the value', async () => {
    const { onValueChange } = await setup();
    await openPicker();

    await fireEvent.press(screen.getByText('Done'));

    expect(screen.queryByText('Done')).not.toBeOnTheScreen();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('picks a tapped option and closes', async () => {
    const { onValueChange } = await setup();
    await openPicker();

    await fireEvent.press(screen.getByText('157 cm'));

    expect(onValueChange).toHaveBeenCalledWith(157);
    expect(screen.queryByText('Done')).not.toBeOnTheScreen();
    expect(screen.getByText('157 cm')).toBeOnTheScreen();
  });

  it('switches units and keeps the picker open', async () => {
    const { onUnitChange, onValueChange } = await setup(182.88);
    await openPicker();

    await fireEvent.press(screen.getByText('ft/in'));

    expect(onUnitChange).toHaveBeenCalledWith('in');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByText('Done')).toBeOnTheScreen();
    // the same height, now shown in feet and inches, and imperial options listed
    expect(screen.getAllByText('6\'0"').length).toBeGreaterThan(0);
    expect(screen.getByText('5\'1"')).toBeOnTheScreen();
  });

  it('updates the value while scrolling, without a tap or a scroll-end event', async () => {
    const { onValueChange } = await setup();
    await openPicker();

    await fireEvent.scroll(screen.getByTestId('measurement-wheel'), {
      nativeEvent: { contentOffset: { y: OPTION_HEIGHT * 2 } }
    });
    expect(onValueChange).toHaveBeenLastCalledWith(157);

    await fireEvent.scroll(screen.getByTestId('measurement-wheel'), {
      nativeEvent: { contentOffset: { y: OPTION_HEIGHT * 7 } }
    });
    expect(onValueChange).toHaveBeenLastCalledWith(162);
    // the picker stays open and its header shows the live value
    expect(screen.getByText('Done')).toBeOnTheScreen();
    expect(screen.getAllByText('162 cm').length).toBeGreaterThan(0);
  });

  it('selects the row the wheel stops on', async () => {
    const { onValueChange } = await setup();
    await openPicker();

    await fireEvent(screen.getByTestId('measurement-wheel'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: OPTION_HEIGHT * 4 } }
    });

    // options start at 155 cm, so row 4 is 159 cm
    expect(onValueChange).toHaveBeenLastCalledWith(159);
  });

  it('snaps to the nearest row when the wheel stops between two', async () => {
    const { onValueChange } = await setup();
    await openPicker();

    await fireEvent(screen.getByTestId('measurement-wheel'), 'scrollEndDrag', {
      nativeEvent: { contentOffset: { y: OPTION_HEIGHT * 2.6 } }
    });

    expect(onValueChange).toHaveBeenLastCalledWith(158);
  });

  it('never selects a row outside the list', async () => {
    const { onValueChange } = await setup();
    await openPicker();
    const wheel = screen.getByTestId('measurement-wheel');

    await fireEvent(wheel, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: -500 } }
    });
    expect(onValueChange).toHaveBeenLastCalledWith(HEIGHT_RANGE_CM.min);

    await fireEvent(wheel, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: OPTION_HEIGHT * 5000 } }
    });
    expect(onValueChange).toHaveBeenLastCalledWith(HEIGHT_RANGE_CM.max);
  });

  it('does not report a change when the wheel stops on the current value', async () => {
    const { onValueChange } = await setup(155);
    await openPicker();

    await fireEvent(screen.getByTestId('measurement-wheel'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 0 } }
    });

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
