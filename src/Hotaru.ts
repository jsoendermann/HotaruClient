import axios from 'axios';
import { isAlphanumeric } from 'validator';
import freshId from 'fresh-id';
import { HotaruUser, UserChange } from './HotaruUser';
import { HotaruError } from './HotaruError';


const INSTALLATION_ID_KEY = 'com.primlo.hotaru.installationId';
const SESSION_ID_KEY = 'com.primlo.hotaru.sessionId';
const USER_DATA_KEY = 'com.primlo.hotaru.userData';
const USER_CHANGELOG_KEY = 'com.primlo.hotaru.userChangelog';

export interface InitializationParameters {
  serverUrl: string;
  privateMode: boolean;
  overrideSSLRequirement: boolean;
  storage: Storage;
}

export interface Storage {
  getItem: (key: string) => Promise<any>;
  setItem: (key: string, value: any) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

class EphemeralStorage implements Storage {
  private data = {} as any;

  async getItem(key: string): Promise<any> {
    return this.data[key];
  }

  async setItem(key: string, value: any): Promise<void> {
    this.data[key] = value;
  }

  async removeItem(key: string): Promise<void> {
    delete this.data[key];
  }
}

class StorageController {
  private storage: Storage;

  constructor(storage: Storage) {
    if (storage) {
      this.storage = storage;
    } else {
      this.storage = new EphemeralStorage();
    }
  }

  public async getPrimitive(key: string): Promise<any> {
    return this.storage.getItem(key);
  }

  public async setPrimitive(key: string, value: boolean | number | string): Promise<void> {
    return this.storage.setItem(key, value);
  }

  public async getObject(key: string): Promise<any> {
    const json = await this.storage.getItem(key);

    if (json != null) {
      return JSON.parse(json, (key, value) => {
        if (typeof value === 'string') {
          const a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
          if (a) {
            return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]));
          }
        }
        return value;
      });
    } else {
      return null;
    }
  }

  public async setObject(key: string, value: any): Promise<void> {
    const json = JSON.stringify(value);
    return this.storage.setItem(key, json);
  }

  public async removeItem(key: string): Promise<void> {
    return this.storage.removeItem(key);
  }
}

export namespace Hotaru {
  let hasBeenInitialized = false;
  let storageController: StorageController;
  let serverUrl_: string;
  let privateMode: boolean;

  let sessionId: string;
  let userData: any;
  let userChangelog: UserChange[];

  let installationId_: string;

  export const initialize = async ({ serverUrl, privateMode = false, overrideSSLRequirement = false, storage }: InitializationParameters) => {
    if (hasBeenInitialized) {
      throw new HotaruError(HotaruError.ALREADY_INITIALIZED);
    }

    storageController = new StorageController(storage);
    if (storage !== undefined && storageController.getPrimitive(INSTALLATION_ID_KEY)) {
      await storageController.setPrimitive(INSTALLATION_ID_KEY, freshId());
    }

    if (!serverUrl.startsWith('https://') && !overrideSSLRequirement) {
      throw new HotaruError(HotaruError.SSL_REQUIRED);
    }

    if (!serverUrl.endsWith('/')) {
      serverUrl_ = `${serverUrl}/`;
    } else {
      serverUrl_ = serverUrl;
    }

    privateMode = privateMode;

    await loadData();

    hasBeenInitialized = true;
  }

  export const getInstallationId = async (): Promise<string> => {
    return await storageController.getPrimitive(INSTALLATION_ID_KEY);
  }

  const makeRequest = async (endpoint: string, params: any): Promise<any> => {
    const paramsAndOtherStuff = Object.assign({}, params, {
      installationId: await getInstallationId(),
      // SDK version
      // OS (name/version)
    });

    const response = await axios.post(serverUrl_ + endpoint, params);
    if (response.data.status !== 'ok') {
      if (response.data.code && response.data.code >= 500) {
        throw new HotaruError(response.data.code);
      }
      const error = new Error(response.data.message);
      throw error;
    }
    return response.data.result;
  }

  const loadData = async (): Promise<void> => {
    userData = await storageController.getObject(USER_DATA_KEY);
    userChangelog = await storageController.getObject(USER_CHANGELOG_KEY);
    sessionId = await storageController.getPrimitive(SESSION_ID_KEY);
  }

  const clearUserDataAndSession = async (): Promise<void> => {
    await storageController.removeItem(SESSION_ID_KEY);
    await storageController.removeItem(USER_DATA_KEY);
    await storageController.removeItem(USER_CHANGELOG_KEY);
    sessionId = null;
    userData = null;
    userChangelog = null;
  }

  const saveSessionIdToDisk = async (): Promise<void> => {
    return storageController.setPrimitive(SESSION_ID_KEY, sessionId);
  }

  const saveUserToDisk = async (): Promise<void> => {
    await storageController.setObject(USER_DATA_KEY, userData);
    await storageController.setObject(USER_CHANGELOG_KEY, userChangelog);
  }

  const ensureInitialization = (): void => {
    if (!hasBeenInitialized) {
      throw new HotaruError(HotaruError.UNINITIALIZED);
    }
  }

  // TODO what happens if we log in, get a user, then log out. the user object will point to nothing
  export const currentUser = (): HotaruUser => {
    ensureInitialization();

    if (userData === null || userChangelog === null || sessionId === null) {
      return null;
    }

    const user = new HotaruUser({
      get: (field) => userData[field],
      set: (field, value) => { userData[field] = value; },
      appendChange: (change) => {
        if (change.type === 'set') {
          userChangelog = userChangelog.filter(c => c.field !== change.field);
        }
        userChangelog.push(change);
      },
      // The user doesn't need access to these
      getRawData: () => null,
      getChangelog: () => null,
    });
    Object.seal(user);
    return user;
  }


  export const logInAsGuest = async (): Promise<void> => {
    ensureInitialization();

    if (userData !== null || userChangelog !== null) {
      throw new HotaruError(HotaruError.STILL_LOGGED_IN);
    }

    const result = await makeRequest('_logInAsGuest', {});

    sessionId = result.sessionId;
    userData = result.userData;
    userChangelog = [];

    await saveSessionIdToDisk();
    await saveUserToDisk();
  }

  export const signUp = async (email: string, password: string): Promise<void> => {
    ensureInitialization();

    if (userData !== null || userChangelog !== null) {
      throw new HotaruError(HotaruError.STILL_LOGGED_IN);
    }

    const result = await makeRequest('_signUp', { email, password });

    sessionId = result.sessionId;
    userData = result.userData;
    userChangelog = [];

    await saveSessionIdToDisk();
    await saveUserToDisk();
  }

  export const convertGuestUser = async (email: string, password: string): Promise<void> => {
    ensureInitialization();

    await synchronizeUser();

    const result = await makeRequest('_convertGuestUser', { sessionId: sessionId, email, password });

    userData = result.userData;

    await saveUserToDisk();
  }

  export const logIn = async (email: string, password: string): Promise<void> => {
    ensureInitialization();

    if (userData !== null || userChangelog !== null) {
      throw new HotaruError(HotaruError.STILL_LOGGED_IN);
    }

    const result = await makeRequest('_logIn', { email, password });

    sessionId = result.sessionId;
    userData = result.userData;
    userChangelog = [];

    await saveSessionIdToDisk();
    await saveUserToDisk();
  }

  export const logOut = async (): Promise<void> => {
    ensureInitialization();

    await synchronizeUser();

    makeRequest('_logOut', { sessionId: sessionId });

    await clearUserDataAndSession();
  }

  export const forceLogOut = async (): Promise<void> => {
    ensureInitialization();
    clearUserDataAndSession();
  }

  export const synchronizeUser = async (): Promise<void> => {
    ensureInitialization();

    const result = await makeRequest('_synchronizeUser', {
      sessionId: sessionId,
      clientChangelog: userChangelog,
    });

    userData = result.user;

    const processedChanges = result.processedChanges;
    userChangelog = userChangelog.filter(c => !processedChanges.includes(c._id));

    await saveUserToDisk();
  }

  export const run = async (funcName: string, params: any): Promise<any> => {
    ensureInitialization();

    if (!isAlphanumeric(funcName)) {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FUNCTION_NAME);
    }

    const result = await makeRequest(funcName, { sessionId: sessionId, params });
    return result;
  }
};
