import { PLAYER_ARCHETYPES, PLAYER_POSITIONS } from '../../src/data/playerOptions';
import { createDefaultMeasurements } from '../../src/lib/measurements';
import {
  buildFallbackSignupProfile,
  formatNameFromEmail,
  needsPlayerSetupAfterSignIn,
  suggestPlayerName
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

describe('needsPlayerSetupAfterSignIn', () => {
  it('asks Google accounts for the player setup', () => {
    expect(needsPlayerSetupAfterSignIn({ app_metadata: { provider: 'google' } })).toBe(true);
  });

  it('keeps email accounts on the profile entered at sign-up', () => {
    expect(needsPlayerSetupAfterSignIn({ app_metadata: { provider: 'email' } })).toBe(false);
    expect(needsPlayerSetupAfterSignIn({ email: 'a@b.com' })).toBe(false);
    expect(needsPlayerSetupAfterSignIn({ app_metadata: null })).toBe(false);
  });
});

describe('suggestPlayerName', () => {
  it('prefers the full name Google shared', () => {
    expect(
      suggestPlayerName({
        email: 'jm23@gmail.com',
        user_metadata: { full_name: '  Jordan Miles ', name: 'Jordan' }
      })
    ).toBe('Jordan Miles');
  });

  it('falls back to the name, then to the email', () => {
    expect(suggestPlayerName({ user_metadata: { name: 'Jordan' } })).toBe('Jordan');
    expect(
      suggestPlayerName({ email: 'jordan.miles@gmail.com', user_metadata: { full_name: '' } })
    ).toBe('Jordan Miles');
    expect(suggestPlayerName({ user_metadata: { full_name: 42 } })).toBe('');
  });
});
