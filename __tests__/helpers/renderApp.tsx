import React, { PropsWithChildren, ReactElement } from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../../src/store/AuthContext';
import { ProgressProvider, useProgress } from '../../src/store/ProgressContext';

export const AppProviders = ({ children }: PropsWithChildren) => (
  <AuthProvider>
    <ProgressProvider>{children}</ProgressProvider>
  </AuthProvider>
);

/** Exposes the live player state as text so screen tests can assert on it. */
const StateProbe = () => {
  const { player, isHydrating, state, levelInfo, ovr } = useProgress();

  return (
    <Text testID="state-probe">
      {JSON.stringify({
        isHydrating,
        name: player.name,
        mainGoal: player.mainGoal,
        position: player.position,
        archetype: player.archetype,
        heightCm: player.heightCm,
        heightUnit: player.heightUnit,
        wingspanCm: player.wingspanCm,
        wingspanUnit: player.wingspanUnit,
        weightKg: player.weightKg,
        weightUnit: player.weightUnit,
        totalXp: player.totalXp,
        level: levelInfo.level,
        ovr,
        sessions: state.trainingSessions.length
      })}
    </Text>
  );
};

export const readProbe = () =>
  JSON.parse(screen.getByTestId('state-probe').props.children as string) as {
    isHydrating: boolean;
    name: string;
    mainGoal: string;
    position: string;
    archetype: string;
    heightCm: number;
    heightUnit: string;
    wingspanCm: number;
    wingspanUnit: string;
    weightKg: number;
    weightUnit: string;
    totalXp: number;
    level: number;
    ovr: number;
    sessions: number;
  };

/** Renders screens inside the real providers and waits for loading to finish. */
export const renderApp = async (ui: ReactElement) => {
  const result = await render(
    <AppProviders>
      {ui}
      <StateProbe />
    </AppProviders>
  );

  await waitFor(() => expect(readProbe().isHydrating).toBe(false));

  return result;
};
