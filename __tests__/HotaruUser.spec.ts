/// <reference path="../typings/globals/jest/index.d.ts" />

import { HotaruUser, HotaruError, SelfContainedUserDataStore, UserChange } from '../src/';

describe('HotaruUser', function () {
  it('should construct user objects', async function () {
    const data = {};
    const userDataStore = new SelfContainedUserDataStore(data, []);

    const user = new HotaruUser(userDataStore);
    expect(user._getDataStore().getRawData()).not.toBe(data); // This object gets deep copied
  });

  it('should get fields with get', async function () {
    const user = new HotaruUser(new SelfContainedUserDataStore({ a: 1 }));
    expect(user.get('a')).toEqual(1);
  });

  it('should only allow alphanumeric field names when getting', async function () {
    const user = new HotaruUser(new SelfContainedUserDataStore({ }));
    try {
      user.get('__bla');
    } catch (error) {
      expect(error.code).toEqual(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }
  });

  it('should only allow setting alphanumeric fields', async function () {
    const user = new HotaruUser(new SelfContainedUserDataStore({}));
    try {
      user.set('__bla', 1);
    } catch (error) {
      expect(error.code).toEqual(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }
  });

  it('should set values', async function () {
    const user = new HotaruUser(new SelfContainedUserDataStore({}));
    user.set('a', 42);
    expect(user.get('a')).toEqual(42);
  });

  const s = (changelog: UserChange[]) => changelog.map(entry => ({
    type: entry.type,
    field: entry.field,
    value: entry.value,
  }));

  it('should keep a changelog', () => {
    const user = new HotaruUser(new SelfContainedUserDataStore({ a: 1, b: [] }, []));
    user.set('a', 2);

    expect(s(user._getDataStore().getChangelog())).toEqual([
      { type: 'set', field: 'a', value: 2 },
    ]);

    user.increment('a');

    expect(s(user._getDataStore().getChangelog())).toEqual([
      { type: 'set', field: 'a', value: 2 },
      { type: 'increment', field: 'a', value: 1 },
    ]);

    user.set('b', 'bla');

    expect(s(user._getDataStore().getChangelog())).toEqual([
      { type: 'set', field: 'a', value: 2 },
      { type: 'increment', field: 'a', value: 1 },
      { type: 'set', field: 'b', value: 'bla' },
    ]);

    user.set('a', 3);

    expect(s(user._getDataStore().getChangelog())).toEqual([
      { type: 'set', field: 'b', value: 'bla' },
      { type: 'set', field: 'a', value: 3 },
    ]);
  });

  it('should allow setting internal fields with _internalSet', () => {
    const user = new HotaruUser(new SelfContainedUserDataStore({}));
    user._internalSet('__foo', 42);
    expect(user._getDataStore().getRawData()).toEqual({ __foo: 42 });
  });

  it('sholud increment and decrement fields', () => {
    const user = new HotaruUser(new SelfContainedUserDataStore({ a: 1, b: 10 }));
    user.increment('a', 1);
    user.decrement('b', 2);
    user.increment('c');
    expect(user.get('a')).toEqual(2);
    expect(user.get('b')).toEqual(8);
    expect(user.get('c')).toEqual(1);
  });

  it('should append', () => {
    const user = new HotaruUser(new SelfContainedUserDataStore({ a: [] }));
    user.append('a', 1);
    user.append('b', 2);
    expect(user.get('a')).toEqual([1]);
    expect(user.get('b')).toEqual([2]);
  });

  it('should tell you if someone is a guest', () => {
    const user1 = new HotaruUser(new SelfContainedUserDataStore({}));
    expect(user1.isGuest()).toBeTruthy();
    const user2 = new HotaruUser(new SelfContainedUserDataStore({ email: null }));
    expect(user2.isGuest()).toBeTruthy();
    const user3 = new HotaruUser(new SelfContainedUserDataStore({ email: 'blabla' }));
    expect(user3.isGuest()).toBeFalsy();
  });
});
