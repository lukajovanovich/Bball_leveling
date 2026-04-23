import { ActivityLogItem, PlayerProfile, ProgressState } from '../types';
import { createInitialQuests } from './quests';
import { colors } from '../theme/theme';

export const samplePlayer: PlayerProfile = {
  id: 'player-1',
  name: 'Jalen Novak',
  height: '6\'3"',
  position: 'Shooting Guard',
  mainGoal: 'Become a reliable two-way shot creator',
  archetype: 'Shot-Creating Guard',
  totalXp: 840,
  attributes: {
    closeShot: 68,
    drivingLayup: 72,
    drivingDunk: 59,
    standingDunk: 45,
    postControl: 52,
    midRangeShot: 70,
    threePointShot: 66,
    freeThrow: 74,
    passAccuracy: 63,
    ballHandle: 71,
    speedWithBall: 68,
    interiorDefense: 48,
    perimeterDefense: 64,
    steal: 58,
    block: 44,
    offensiveRebound: 42,
    defensiveRebound: 55,
    speed: 73,
    acceleration: 71,
    strength: 57,
    vertical: 65,
    stamina: 69
  }
};

export const initialActivityLog: ActivityLogItem[] = [
  {
    id: 'activity-seed-1',
    type: 'workout',
    title: 'Shooting Workout logged',
    description: '+120 XP and better touch from mid-range.',
    createdAt: '2026-04-22T18:30:00.000Z',
    accentColor: colors.green
  },
  {
    id: 'activity-seed-2',
    type: 'attribute',
    title: 'Ball Handle improved',
    description: 'Control is trending toward the next badge tier.',
    createdAt: '2026-04-21T17:15:00.000Z',
    accentColor: colors.orange
  },
  {
    id: 'activity-seed-3',
    type: 'quest',
    title: 'Daily quest completed',
    description: 'Workout streak XP added to your build.',
    createdAt: '2026-04-20T19:10:00.000Z',
    accentColor: colors.gold
  }
];

export const createInitialProgressState = (): ProgressState => ({
  player: samplePlayer,
  quests: createInitialQuests(samplePlayer.attributes),
  trainingSessions: [],
  activityLog: initialActivityLog,
  lastLevelUp: null
});
