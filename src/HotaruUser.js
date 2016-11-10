import { isAlphanumeric } from 'validator';
import { HotaruError } from './';

export class HotaruUser {
  constructor(dataStore) {
    this._dataStore = dataStore;
  }

  _getDataStore() {
    return this._dataStore;
  }

  get(field) {
    if (!isAlphanumeric(field) && field !== '_id') {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    return this._dataStore.get(field);
  }

  set(field, value) {
    if (!isAlphanumeric(field)) {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    if (this._dataStore.set === undefined) {
      throw new HotaruError(HotaruError.READ_ONLY_USER);
    }

    this._dataStore.set(field, value);

    if (this._dataStore.appendChange !== null) {
      this._dataStore.appendChange({
        date: new Date(),
        type: 'set',
        field,
        value,
      });
    }
  }

  _internalSet(field, value) {
    this._dataStore.set(field, value);
  }

  increment(field, value = 1) {
    if (!isAlphanumeric(field)) {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    if (this._dataStore.get(field) === undefined) {
      this._dataStore.set(field, 0);
    }
    if (typeof this._dataStore.get(field) !== 'number') {
      throw new HotaruError(HotaruError.CAN_ONLY_INCREMENT_AND_DECREMENT_NUMBERS, `${field} is of type ${typeof this._dataStore.get(field)}`);
    }

    if (this._dataStore.set === undefined) {
      throw new HotaruError(HotaruError.READ_ONLY_USER);
    }

    this._dataStore.set(field, this._dataStore.get(field) + value);

    if (this._dataStore.appendChange !== null) {
      this._dataStore.appendChange({
        date: new Date(),
        type: 'increment',
        field,
        value,
      });
    }
  }

  decrement(field, value = 1) {
    this.increment(field, -value);
  }

  append(field, value) {
    if (!isAlphanumeric(field)) {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    if (this._dataStore.get(field) === undefined) {
      this._dataStore.set(field, []);
    }
    if (!Array.isArray(this._dataStore.get(field))) {
      throw new HotaruError(HotaruError.CAN_ONLY_APPEND_TO_ARRAYS, `${field} is of type ${typeof this._dataStore.get(field)}`);
    }

    this._dataStore.set(field, [...this._dataStore.get(field), value]);

    if (this._dataStore.appendChange !== null) {
      this._dataStore.appendChange({
        date: new Date(),
        type: 'append',
        field,
        value,
      });
    }
  }

  isGuest() {
    return !this._dataStore.get('email');
  }
}
