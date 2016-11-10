/* global jasmine, beforeAll, beforeEach, describe, it, expect */
/* eslint prefer-arrow-callback:0, func-names:0, global-require:0, import/no-extraneous-dependencies:0 */

import express from 'express';
import install from 'jasmine-es6';
import toBeAnAlphanumericString from 'to-be-an-alphanumeric-string';
import decache from 'decache';

import { HotaruServer, MongoAdapter } from 'hotaru-server'; // TODO import package


install();


describe('Hotaru', function () {
  beforeAll(async function () {
    jasmine.addMatchers({ toBeAnAlphanumericString });

    const app = express();

    this.dbAdapter = new MongoAdapter({
      uri: 'mongodb://localhost:27017/hotaru_js_sdk_test_01',
    });

    const server = HotaruServer.createServer({
      dbAdapter: this.dbAdapter,
      cloudFunctions: [
        // {
        //   name: 'hello',
        //   func: async (dbAdapter, user, params, installationDetails) => {
        //     return params;
        //   },
        // },
        // {
        //   name: 'world',
        //   func: async (dbAdapter, user, params, installationDetails) => {
        //   },
        // },
      ],
      debug: true,
    });

    app.use('/api', server);
    app.listen(3002);
  });

  beforeEach(async function () {
    const db = await this.dbAdapter._getDb();
    await db.dropDatabase();

    const HOTARU_IMPORT_PATH = '../lib/Hotaru';
    decache(HOTARU_IMPORT_PATH);
    this.Hotaru = require(HOTARU_IMPORT_PATH).default;
    await this.Hotaru.initialize('http://localhost:3002/api/', { overrideSSLRequirement: true, storage: 'no storage' });
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
