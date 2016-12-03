import { isAlphanumeric } from 'validator';
import freshId from 'fresh-id';
import { HotaruError } from './';
import { IUserDataStore } from './UserDataStore';


export interface UserChangeBody {
  _id: string;
  date: any;
  field: string;
  value: any;
}

export interface SetUserChange extends UserChangeBody {
  type: 'set';
}

export interface IncrementUserChange extends UserChangeBody {
  type: 'increment';
}

export interface AppendUserChange extends UserChangeBody {
  type: 'append';
}

export type UserChange = SetUserChange | IncrementUserChange | AppendUserChange;



export class HotaruUser {
  private dataStore: IUserDataStore;

  constructor(dataStore: IUserDataStore) {
    this.dataStore = dataStore;
  }

  _getDataStore(): IUserDataStore {
    return this.dataStore;
  }

  get(field: string): any {
    if (!isAlphanumeric(field) && field !== '_id') {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    return this.dataStore.get(field);
  }

  set(field: string, value: any) {
    if (!isAlphanumeric(field)) {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    if (this.dataStore.set === undefined) {
      throw new HotaruError(HotaruError.READ_ONLY_USER);
    }

    this.dataStore.set(field, value);

    if (this.dataStore.appendChange !== null) {
      this.dataStore.appendChange({
        _id: freshId(),
        date: new Date(),
        type: 'set',
        field,
        value,
      });
    }
  }

  // TODO Solve this by subclassing
  _internalSet(field: string, value: any) {
    this.dataStore.set(field, value);
  }

  increment(field: string, value: number = 1) {
    if (!isAlphanumeric(field)) {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    if (this.dataStore.get(field) === undefined) {
      this.dataStore.set(field, 0);
    }
    if (typeof this.dataStore.get(field) !== 'number') {
      throw new HotaruError(HotaruError.CAN_ONLY_INCREMENT_AND_DECREMENT_NUMBERS, `${field} is of type ${typeof this.dataStore.get(field)}`);
    }

    if (this.dataStore.set === undefined) {
      throw new HotaruError(HotaruError.READ_ONLY_USER);
    }

    this.dataStore.set(field, this.dataStore.get(field) + value);

    if (this.dataStore.appendChange !== null) {
      this.dataStore.appendChange({
        _id: freshId(),
        date: new Date(),
        type: 'increment',
        field,
        value,
      });
    }
  }

  decrement(field: string, value: number = 1) {
    this.increment(field, -value);
  }

  append(field: string, value: any) {
    if (!isAlphanumeric(field)) {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    if (this.dataStore.get(field) === undefined) {
      this.dataStore.set(field, []);
    }
    if (!Array.isArray(this.dataStore.get(field))) {
      throw new HotaruError(HotaruError.CAN_ONLY_APPEND_TO_ARRAYS, `${field} is of type ${typeof this.dataStore.get(field)}`);
    }

    this.dataStore.set(field, [...this.dataStore.get(field), value]);

    if (this.dataStore.appendChange !== null) {
      this.dataStore.appendChange({
        _id: freshId(),
        date: new Date(),
        type: 'append',
        field,
        value,
      });
    }
  }

  isGuest(): boolean {
    return !this.dataStore.get('email');
  }
}
