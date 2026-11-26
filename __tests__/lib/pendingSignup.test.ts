import {
  clearPendingSignupProfile,
  getPendingSignupProfile,
  savePendingSignupProfile
} from '../../src/lib/pendingSignup';
import { signupProfile } from '../helpers/fixtures';

const STORAGE_KEY = 'bball-leveling.pending-signup-profile';

describe('pending signup profile', () => {
  it('is empty until something is saved', () => {
    expect(getPendingSignupProfile()).toBeNull();
  });

  it('returns exactly what was saved', () => {
    savePendingSignupProfile(signupProfile);

    expect(getPendingSignupProfile()).toEqual(signupProfile);
  });

  it('overwrites an earlier pending profile', () => {
    savePendingSignupProfile(signupProfile);
    savePendingSignupProfile({ ...signupProfile, name: 'Second Try' });

    expect(getPendingSignupProfile()?.name).toBe('Second Try');
  });

  it('can be cleared', () => {
    savePendingSignupProfile(signupProfile);
    clearPendingSignupProfile();

    expect(getPendingSignupProfile()).toBeNull();
  });

  it('is only handed to the account it was typed for', () => {
    savePendingSignupProfile(signupProfile, ' Sam@Example.com ');

    expect(getPendingSignupProfile('sam@example.com')).toEqual(signupProfile);
    expect(getPendingSignupProfile('SAM@example.com')).toEqual(signupProfile);
    expect(getPendingSignupProfile('other@example.com')).toBeNull();
    expect(getPendingSignupProfile(null)).toBeNull();
    // Without an account to compare with, it is still readable.
    expect(getPendingSignupProfile()).toEqual(signupProfile);
  });

  it('treats a profile saved without an email (older versions) as anyone\'s', () => {
    savePendingSignupProfile(signupProfile);

    expect(getPendingSignupProfile('anyone@example.com')).toEqual(signupProfile);
  });

  it('forgets the account when a later profile is saved without one, or on clear', () => {
    savePendingSignupProfile(signupProfile, 'sam@example.com');
    savePendingSignupProfile(signupProfile);

    expect(getPendingSignupProfile('other@example.com')).toEqual(signupProfile);

    savePendingSignupProfile(signupProfile, 'sam@example.com');
    clearPendingSignupProfile();
    savePendingSignupProfile(signupProfile);

    expect(getPendingSignupProfile('other@example.com')).toEqual(signupProfile);
  });

  it('clearing when nothing is stored does not throw', () => {
    expect(() => clearPendingSignupProfile()).not.toThrow();
  });

  it('ignores corrupted stored data instead of crashing', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');

    expect(getPendingSignupProfile()).toBeNull();
  });

  it('ignores stored values that are not a profile object', () => {
    localStorage.setItem(STORAGE_KEY, '"just a string"');
    expect(getPendingSignupProfile()).toBeNull();

    localStorage.setItem(STORAGE_KEY, 'null');
    expect(getPendingSignupProfile()).toBeNull();

    localStorage.setItem(STORAGE_KEY, '[1,2,3]');
    expect(getPendingSignupProfile()).toBeNull();
  });
});
