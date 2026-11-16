import { PLAYER_ARCHETYPES, PLAYER_POSITIONS } from '../../src/data/playerOptions';
import { createDefaultMeasurements } from '../../src/lib/measurements';
import {
  buildFallbackSignupProfile,
  formatNameFromEmail
} from '../../src/lib/playerIdentity';

describe('formatNameFromEmail', () => {
  it('turns the part before @ into a capitalized name', () => {
    expect(formatNameFromEmail('john.doe@example.com')).toBe('John Doe');
    expect(formatNameFromEmail('luka_j-12@example.com')).toBe('Luka J 12');
    expect(formatNameFromEmail('mj@example.com')).toBe('Mj');
  });

  it('collapses repeated separators', () => {
    expect(formatNameFromEmail('john..doe__smith@example.com')).toBe('John Doe Smith');
    expect(formatNameFromEmail('.john.@example.com')).toBe('John');
  });

  it('works while the email is still being typed', () => {
    expect(formatNameFromEmail('jalen')).toBe('Jalen');
    expect(formatNameFromEmail('  jalen.novak  ')).toBe('Jalen Novak');
  });

  it('returns an empty string when there is no usable name', () => {
    expect(formatNameFromEmail('')).toBe('');
    expect(formatNameFromEmail('@example.com')).toBe('');
    expect(formatNameFromEmail('   ')).toBe('');
    expect(formatNameFromEmail('...@example.com')).toBe('');
  });
});

describe('buildFallbackSignupProfile', () => {
  it('derives the name from the email', () => {
    expect(buildFallbackSignupProfile('jalen.novak@example.com').name).toBe(
      'Jalen Novak'
    );
  });

  it('uses a generic name when there is no email', () => {
    expect(buildFallbackSignupProfile(null).name).toBe('MyPlayer');
    expect(buildFallbackSignupProfile(undefined).name).toBe('MyPlayer');
    expect(buildFallbackSignupProfile('').name).toBe('MyPlayer');
  });

  it('fills every other field with the app defaults', () => {
    expect(buildFallbackSignupProfile('a@b.co')).toEqual({
      name: 'A',
      ...createDefaultMeasurements(),
      position: PLAYER_POSITIONS[0],
      archetype: PLAYER_ARCHETYPES[0],
      mainGoal: 'Build my player from the ground up'
    });
  });
});
