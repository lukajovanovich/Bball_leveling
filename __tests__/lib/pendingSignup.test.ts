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
