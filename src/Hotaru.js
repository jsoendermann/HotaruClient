import axios from 'axios';
import { isAlphanumeric } from 'validator';
import HotaruUser from './HotaruUser';
import HotaruError from './HotaruError';
import { freshId } from './utils';

const INSTALLATION_ID_KEY = 'com.primlo.hotaru.installationId';
const SESSION_ID_KEY = 'com.primlo.hotaru.currentSessionId';
const USER_DATA_KEY = 'com.primlo.hotaru.userData';
const USER_CHANGELOG_KEY = 'com.primlo.hotaru.userChangelog';


export const Hotaru = {
  async initialize(url, { privateMode = false, overrideSSLRequirement = false, storage } = {}) {
    if (this._hasBeenInitialized !== undefined) {
      throw new HotaruError(HotaruError.ALREADY_INITIALIZED);
    }

    if (storage === undefined) {
      throw new HotaruError(HotaruError.STORAGE_UNDEFINED);
    } else if (storage === 'no storage') {
      this._storage = null;
    } else if (typeof storage === 'object') {
      this._storage = storage;
    } else {
      throw new HotaruError(HotaruUser.INVALID_STORAGE, String(storage));
    }

    if (!url.startsWith('https://') && !overrideSSLRequirement) {
      throw new HotaruError(HotaruError.SSL_REQUIRED);
    }

    if (!url.endsWith('/')) {
      this._url = `${url}/`;
    } else {
      this._url = url;
    }

    this._privateMode = privateMode;

    this.INSTALLATION_ID = await this._storage.getItem(INSTALLATION_ID_KEY);
    if (this.INSTALLATION_ID === null) {
      this.INSTALLATION_ID = freshId();
      await this._storage.setItem(INSTALLATION_ID_KEY, this.INSTALLATION_ID);
    }

    await this._loadData();

    this._hasBeenInitialized = true;
  },

  async _makeRequest(endpoint, params) {
    const paramsAndOtherStuff = Object.assign({}, params);
    Object.assign(paramsAndOtherStuff, {
      installationId: this.INSTALLATION_ID,
      // SDK version
      // OS (name/version)
    });

    const response = await axios.post(this._url + endpoint, params);
    if (response.data.status !== 'ok') {
      if (response.data.code && response.data.code >= 500) {
        throw new HotaruError(response.data.code);
      }
      const error = new Error(response.data.message);
      error.code = response.data.code;
      throw error;
    }
    return response.data.result;
  },

  async _loadData() {
    if (this._storage !== null) {
      const userDataPromise = this._storage.getItem(USER_DATA_KEY);
      const userChangesQueuePromise = this._storage.getItem(USER_CHANGELOG_KEY);
      const sessionIdPromise = this._storage.getItem(SESSION_ID_KEY);
      const userDataString = await userDataPromise;
      const userChangesQueueString = await userChangesQueuePromise;
      this._sessionId = await sessionIdPromise;

      if (userDataString === null) {
        this._userData = null;
      } else {
        this._userData = JSON.parse(userDataString);
      }

      if (userChangesQueueString === null) {
        this._userChangelog = null;
      } else {
        this._userChangelog = JSON.parse(userChangesQueueString);
      }
    }
  },

  async _clearUserDataAndSession() {
    if (this._storage !== null) {
      await this._storage.removeItem(SESSION_ID_KEY);
      await this._storage.removeItem(USER_DATA_KEY);
      await this._storage.removeItem(USER_CHANGELOG_KEY);
      this._sessionId = null;
      this._userData = null;
      this._userChangelog = null;
    }
  },

  async _saveSessionIdToDisk() {
    if (this._storage !== null) {
      await this._storage.setItem(SESSION_ID_KEY, this._sessionId);
    }
  },

  async _saveUserToDisk() {
    if (this._storage !== null) {
      const dataString = JSON.stringify(this._userData);
      const changesQueueString = JSON.stringify(this._userChangelog);
      await this._storage.setItem(USER_DATA_KEY, dataString);
      await this._storage.setItem(USER_CHANGELOG_KEY, changesQueueString);
    }
  },

  _ensureInitialization() {
    if (!this._hasBeenInitialized) {
      throw new HotaruError(HotaruError.UNINITIALIZED);
    }
  },

  // TODO what happens if we log in, get a user, then log out. the user object will point to nothing
  currentUser() {
    this._ensureInitialization();

    if (this._userData === null || this._userChangelog === null || this._sessionId === null) {
      return null;
    }
    const user = new HotaruUser(this);
    Object.seal(user);
    return user;
  },


  async logInAsGuest() {
    this._ensureInitialization();

    if (this._userData !== null || this._userChangelog !== null) {
      throw new HotaruError(HotaruError.STILL_LOGGED_IN);
    }

    const result = await this._makeRequest('_logInAsGuest', {});

    this._sessionId = result.sessionId;
    this._userData = result.userData;
    this._userChangelog = [];

    await this._saveSessionIdToDisk();
    await this._saveUserToDisk();
  },

  async signUp(email, password) {
    this._ensureInitialization();

    if (this._userData !== null || this._userChangelog !== null) {
      throw new HotaruError(HotaruError.STILL_LOGGED_IN);
    }

    const result = await this._makeRequest('_signUp', { email, password });

    this._sessionId = result.sessionId;
    this._userData = result.userData;
    this._userChangelog = [];

    await this._saveSessionIdToDisk();
    await this._saveUserToDisk();
  },

  async convertGuestUser(email, password) {
    this._ensureInitialization();

    const currentUser = await this.currentUser();
    await currentUser.synchronize();

    const result = await this._makeRequest('_convertGuestUser', { sessionId: this._sessionId, email, password });

    this._userData = result.userData;

    await this._saveUserToDisk();
  },

  async logIn(email, password) {
    this._ensureInitialization();

    if (this._userData !== null || this._userChangelog !== null) {
      throw new HotaruError(HotaruError.STILL_LOGGED_IN);
    }

    const result = await this._makeRequest('_logIn', { email, password });

    this._sessionId = result.sessionId;
    this._userData = result.userData;
    this._userChangelog = [];

    await this._saveSessionIdToDisk();
    await this._saveUserToDisk();
  },

  async logOut() {
    this._ensureInitialization();

    await this.synchronizeUser();

    this._makeRequest('_logOut', { sessionId: this._sessionId });

    await this._clearUserDataAndSession();
  },

  async forceLogOut() {
    this._ensureInitialization();
    this._clearUserDataAndSession();
  },

  async synchronizeUser() {
    this._ensureInitialization();

    const result = await this._makeRequest('_synchronizeUser', {
      sessionId: this._sessionId,
      clientChangelog: this._userChangelog,
    });

    this._userData = result.user;

    const processedChanges = result.processedChanges;
    this._userChangelog = this._userChangelog.filter(c => !processedChanges.includes(c._id));

    await this._saveUserToDisk();
  },

  async run(funcName, params) {
    this._ensureInitialization();

    if (!isAlphanumeric(funcName)) {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FUNCTION_NAME);
    }

    const result = await this._makeRequest(funcName, { sessionId: this._sessionId, params });
    return result;
  },
};
