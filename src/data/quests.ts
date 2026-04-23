import { PlayerAttributes, Quest } from '../types';

export const createInitialQuests = (attributes: PlayerAttributes): Quest[] => [
  {
    id: 'daily-complete-workout',
    title: 'Complete 1 workout',
    description: 'Get one real training session in today.',
    period: 'daily',
    kind: 'complete_workouts',
    rewardXp: 80,
    progress: 0,
    goal: 1,
    completed: false,
    claimed: false
  },
  {
    id: 'daily-defense-workout',
    title: 'Complete 1 Defense Workout',
    description: 'Lock in on footwork, contests, and stops.',
    period: 'daily',
    kind: 'complete_workout_type',
    workoutType: 'defense',
    rewardXp: 100,
    progress: 0,
    goal: 1,
    completed: false,
    claimed: false
  },
  {
    id: 'daily-improve-three',
    title: 'Improve Three-Point Shot',
    description: 'Any shooting workout can move your range forward.',
    period: 'daily',
    kind: 'improve_attribute',
    attributeKey: 'threePointShot',
    rewardXp: 90,
    progress: 0,
    goal: 1,
    completed: false,
    claimed: false
  },
  {
    id: 'weekly-finishing-two',
    title: 'Complete 2 Finishing Workouts',
    description: 'Stack rim pressure reps across the week.',
    period: 'weekly',
    kind: 'complete_workout_type',
    workoutType: 'finishing',
    rewardXp: 220,
    progress: 0,
    goal: 2,
    completed: false,
    claimed: false
  },
  {
    id: 'weekly-ball-handle-75',
    title: 'Reach 75 Ball Handle',
    description: 'Push your handle into dependable creator range.',
    period: 'weekly',
    kind: 'reach_attribute',
    attributeKey: 'ballHandle',
    rewardXp: 260,
    progress: attributes.ballHandle,
    goal: 75,
    completed: attributes.ballHandle >= 75,
    claimed: false
  },
  {
    id: 'weekly-stamina-up',
    title: 'Improve Stamina this week',
    description: 'Conditioning gains make every other skill last longer.',
    period: 'weekly',
    kind: 'improve_attribute',
    attributeKey: 'stamina',
    rewardXp: 180,
    progress: 0,
    goal: 2,
    completed: false,
    claimed: false
  }
];
