import { AttributeCategory, AttributeKey } from '../types';
import { colors } from '../theme/theme';

export const ATTRIBUTE_CATEGORIES: AttributeCategory[] = [
  {
    id: 'finishing',
    title: 'Finishing attributes',
    color: colors.blue,
    attributes: [
      { key: 'closeShot', name: 'Close Shot' },
      { key: 'drivingLayup', name: 'Driving Layup' },
      { key: 'drivingDunk', name: 'Driving Dunk' },
      { key: 'standingDunk', name: 'Standing Dunk' },
      { key: 'postControl', name: 'Post Control' }
    ]
  },
  {
    id: 'shooting',
    title: 'Shooting attributes',
    color: colors.green,
    attributes: [
      { key: 'midRangeShot', name: 'Mid-Range Shot' },
      { key: 'threePointShot', name: 'Three-Point Shot' },
      { key: 'freeThrow', name: 'Free Throw' }
    ]
  },
  {
    id: 'playmaking',
    title: 'Playmaking attributes',
    color: colors.orange,
    attributes: [
      { key: 'passAccuracy', name: 'Pass Accuracy' },
      { key: 'ballHandle', name: 'Ball Handle' },
      { key: 'speedWithBall', name: 'Speed With Ball' }
    ]
  },
  {
    id: 'defense',
    title: 'Defense attributes',
    color: colors.red,
    attributes: [
      { key: 'interiorDefense', name: 'Interior Defense' },
      { key: 'perimeterDefense', name: 'Perimeter Defense' },
      { key: 'steal', name: 'Steal' },
      { key: 'block', name: 'Block' }
    ]
  },
  {
    id: 'rebounding',
    title: 'Rebounding attributes',
    color: colors.purple,
    attributes: [
      { key: 'offensiveRebound', name: 'Offensive Rebound' },
      { key: 'defensiveRebound', name: 'Defensive Rebound' }
    ]
  },
  {
    id: 'physical',
    title: 'Physical attributes',
    color: colors.yellow,
    attributes: [
      { key: 'speed', name: 'Speed' },
      { key: 'acceleration', name: 'Acceleration' },
      { key: 'strength', name: 'Strength' },
      { key: 'vertical', name: 'Vertical' },
      { key: 'stamina', name: 'Stamina' }
    ]
  }
];

export const ATTRIBUTE_NAME_BY_KEY = ATTRIBUTE_CATEGORIES.reduce(
  (names, category) => {
    category.attributes.forEach((attribute) => {
      names[attribute.key] = attribute.name;
    });

    return names;
  },
  {} as Record<AttributeKey, string>
);
