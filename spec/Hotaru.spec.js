/* global jasmine, beforeAll, beforeEach, describe, it, expect */
/* eslint prefer-arrow-callback:0, func-names:0, global-require:0, import/no-extraneous-dependencies:0 */

import install from 'jasmine-es6';
import toBeAnAlphanumericString from 'to-be-an-alphanumeric-string';
import decache from 'decache';

install();


describe('Hotaru', function () {
  beforeAll(async function () {
    jasmine.addMatchers({ toBeAnAlphanumericString });
  });

  beforeEach(async function () {
    const HOTARU_IMPORT_PATH = '../lib/';
    decache(HOTARU_IMPORT_PATH);
    this.Hotaru = require(HOTARU_IMPORT_PATH).Hotaru;
    await this.Hotaru.initialize({ serverUrl: 'http://localhost:3002/api/', overrideSSLRequirement: true });
  });

  it('should log in as guest', async function () {
    await this.Hotaru.logInAsGuest();
    const _id = this.Hotaru.currentUser().get('_id');
    expect(_id).toBeAnAlphanumericString(15);
  });

  it('should sign up guest users', async function () {
    await this.Hotaru.logInAsGuest();
    const user = this.Hotaru.currentUser();
    expect(user.isGuest()).toBeTruthy();
    await this.Hotaru.convertGuestUser('email@example.com', 'password');
    expect(user.isGuest()).toBeFalsy();
  });
});
