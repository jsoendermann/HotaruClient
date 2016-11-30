import axios from 'axios';
import { isAlphanumeric } from 'validator';
import { HotaruUser, UserChange } from './HotaruUser';
import { HotaruError } from './HotaruError';
import { freshId } from './utils';

const INSTALLATION_ID_KEY = 'com.primlo.hotaru.installationId';
const SESSION_ID_KEY = 'com.primlo.hotaru.currentSessionId';
const USER_DATA_KEY = 'com.primlo.hotaru.userData';
const USER_CHANGELOG_KEY = 'com.primlo.hotaru.userChangelog';

interface InitializationParameters {
  serverUrl: string;
  privateMode: boolean;
  overrideSSLRequirement: boolean;
  storage: Storage;
}

interface Storage {
  getItem: (key: string) => Promise<any>;
  setItem: (key: string, value: any) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const DoNotingStorage = {
  async getItem(key: string) { return null; },
  async setItem(key: string) {},
  async removeItem(key: string) {},
}

class _Hotaru {
  private hasBeenInitialized = false;
  private storage: Storage;
  private serverUrl: string;
  private privateMode: boolean;

  private sessionId: string;
  private userData: any;
  private userChangelog: UserChange[];

  private installationId_: string;

  constructor() { }

  public async initialize({serverUrl, privateMode = false, overrideSSLRequirement = false, storage = DoNotingStorage }: InitializationParameters) {
    if (this.hasBeenInitialized) {
      throw new HotaruError('ALREADY_INITIALIZED');
    }

    this.storage = storage;

    if (!serverUrl.startsWith('https://') && !overrideSSLRequirement) {
      throw new HotaruError('SSL_REQUIRED');
    }

    if (!serverUrl.endsWith('/')) {
      this.serverUrl = `${serverUrl}/`;
    } else {
      this.serverUrl = serverUrl;
    }

    this.privateMode = privateMode;

    if (this.storage !== null) {
      this.installationId_ = await this.storage.getItem(INSTALLATION_ID_KEY);
      if (this.installationId_ === null) {
        this.installationId_ = freshId();
        await this.storage.setItem(INSTALLATION_ID_KEY, this.installationId_);
      }
    } else {
      this.installationId_ = null;
    }

    await this.loadData();

    this.hasBeenInitialized = true;
  }

  public get installationId(): string {
    return this.installationId_;
  }

  private async makeRequest(endpoint: string, params: any): Promise<any> {
    const paramsAndOtherStuff = Object.assign({}, params);
    Object.assign(paramsAndOtherStuff, {
      installationId: this.installationId,
      // SDK version
      // OS (name/version)
    });

    const response = await axios.post(this.serverUrl + endpoint, params);
    if (response.data.status !== 'ok') {
      if (response.data.code && response.data.code >= 500) {
        throw new HotaruError(response.data.code);
      }
      const error = new Error(response.data.message);
      throw error;
    }
    return response.data.result;
  }

  private async loadData(): Promise<void> {
    if (this.storage !== null) {
      const userDataPromise = this.storage.getItem(USER_DATA_KEY);
      const userChangesQueuePromise = this.storage.getItem(USER_CHANGELOG_KEY);
      const sessionIdPromise = this.storage.getItem(SESSION_ID_KEY);
      const userDataString = await userDataPromise;
      const userChangesQueueString = await userChangesQueuePromise;
      this.sessionId = await sessionIdPromise;

      if (userDataString === null) {
        this.userData = null;
      } else {
        this.userData = JSON.parse(userDataString);
      }

      if (userChangesQueueString === null) {
        this.userChangelog = null;
      } else {
        this.userChangelog = JSON.parse(userChangesQueueString);
      }
    } else {
      this.sessionId = null;
      this.userData = null;
      this.userChangelog = null;
    }
  }

  private async clearUserDataAndSession() {
    if (this.storage !== null) {
      await this.storage.removeItem(SESSION_ID_KEY);
      await this.storage.removeItem(USER_DATA_KEY);
      await this.storage.removeItem(USER_CHANGELOG_KEY);
      this.sessionId = null;
      this.userData = null;
      this.userChangelog = null;
    }
  }

  private async saveSessionIdToDisk() {
    if (this.storage !== null) {
      await this.storage.setItem(SESSION_ID_KEY, this.sessionId);
    }
  }

  private async saveUserToDisk() {
    if (this.storage !== null) {
      const dataString = JSON.stringify(this.userData);
      const userChangelog = JSON.stringify(this.userChangelog);
      await this.storage.setItem(USER_DATA_KEY, dataString);
      await this.storage.setItem(USER_CHANGELOG_KEY, userChangelog);
    }
  }

  private ensureInitialization() {
    if (!this.hasBeenInitialized) {
      throw new HotaruError('UNINITIALIZED');
    }
  }

  // TODO what happens if we log in, get a user, then log out. the user object will point to nothing
  currentUser(): HotaruUser {
    this.ensureInitialization();

    if (this.userData === null || this.userChangelog === null || this.sessionId === null) {
      return null;
    }

    const user = new HotaruUser({
      get: (field) => this.userData[field],
      set: (field, value) => { this.userData[field] = value; },
      appendChange: (change) => {
        if (change.type === 'set') {
          this.userChangelog = this.userChangelog.filter(c => c.field !== change.field);
        }
        this.userChangelog.push(change);
      },
    });
    Object.seal(user);
    return user;
  }


  public async logInAsGuest() {
    this.ensureInitialization();

    if (this.userData !== null || this.userChangelog !== null) {
      throw new HotaruError('STILL_LOGGED_IN');
    }

    const result = await this.makeRequest('_logInAsGuest', {});

    this.sessionId = result.sessionId;
    this.userData = result.userData;
    this.userChangelog = [];

    await this.saveSessionIdToDisk();
    await this.saveUserToDisk();
  }

  public async signUp(email: string, password: string) {
    this.ensureInitialization();

    if (this.userData !== null || this.userChangelog !== null) {
      throw new HotaruError('STILL_LOGGED_IN');
    }

    const result = await this.makeRequest('_signUp', { email, password });

    this.sessionId = result.sessionId;
    this.userData = result.userData;
    this.userChangelog = [];

    await this.saveSessionIdToDisk();
    await this.saveUserToDisk();
  }

  public async convertGuestUser(email: string, password: string) {
    this.ensureInitialization();

    await this.synchronizeUser();

    const result = await this.makeRequest('_convertGuestUser', { sessionId: this.sessionId, email, password });

    this.userData = result.userData;

    await this.saveUserToDisk();
  }

  public async logIn(email: string, password: string) {
    this.ensureInitialization();

    if (this.userData !== null || this.userChangelog !== null) {
      throw new HotaruError('STILL_LOGGED_IN');
    }

    const result = await this.makeRequest('_logIn', { email, password });

    this.sessionId = result.sessionId;
    this.userData = result.userData;
    this.userChangelog = [];

    await this.saveSessionIdToDisk();
    await this.saveUserToDisk();
  }

  public async logOut() {
    this.ensureInitialization();

    await this.synchronizeUser();

    this.makeRequest('_logOut', { sessionId: this.sessionId });

    await this.clearUserDataAndSession();
  }

  public async forceLogOut() {
    this.ensureInitialization();
    this.clearUserDataAndSession();
  }

  public async synchronizeUser() {
    this.ensureInitialization();

    const result = await this.makeRequest('_synchronizeUser', {
      sessionId: this.sessionId,
      clientChangelog: this.userChangelog,
    });

    this.userData = result.user;

    const processedChanges = result.processedChanges;
    this.userChangelog = this.userChangelog.filter(c => !processedChanges.includes(c._id));

    await this.saveUserToDisk();
  }

  public async run(funcName: string, params: any) {
    this.ensureInitialization();

    if (!isAlphanumeric(funcName)) {
      throw new HotaruError('NON_ALPHANUMERIC_FUNCTION_NAME');
    }

    const result = await this.makeRequest(funcName, { sessionId: this.sessionId, params });
    return result;
  }
};

export const Hotaru = new _Hotaru();