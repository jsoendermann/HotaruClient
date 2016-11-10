import { isAlphanumeric } from 'validator';
import HotaruError from './HotaruError';

export class HotaruUser {
  constructor(data, changelog, eventListener) {
    this._data = data;
    this._changelog = changelog || null;
    this._eventListener = eventListener || null;
  }

  get(field) {
    if (!isAlphanumeric(field) && field !== '_id') {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    return this._data[field];
  }

  _getData() {
    return this._data;
  }

  async set(field, value) {
    if (!isAlphanumeric(field)) {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    this._data[field] = value;

    if (this._changelog !== null) {
      this._changelog = this._changelog.filter(e => e.field !== field);

      this._changelog.push({
        date: new Date(),
        type: 'set',
        field,
        value,
      });
    }

    if (this._eventListener !== null && this._eventListener.onUserWrite) {
      await this._eventListener.onUserWrite('set', field, value);
    }
  }

  async _internalSet(field, value) {
    this._data[field] = value;
    // TODO why no changelog
    if (this._eventListener !== null && this._eventListener.onUserWrite) {
      await this._eventListener.onUserWrite('internalSet', field, value);
    }
  }

  async increment(field, value = 1) {
    if (!isAlphanumeric(field)) {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    if (this._data[field] === undefined) {
      this._data[field] = 0;
    }
    if (typeof this._data[field] !== 'number') {
      throw new HotaruError(HotaruError.CAN_ONLY_INCREMENT_AND_DECREMENT_NUMBERS, `${field} is of type ${typeof this._data[field]}`);
    }

    this._data[field] += value;

    if (this._changelog !== null) {
      this._changelog.push({
        date: new Date(),
        type: 'increment',
        field,
        value,
      });
    }

    if (this._eventListener !== null && this._eventListener.onUserWrite) {
      await this._eventListener.onUserWrite('increment', field, value);
    }
  }

  async decrement(field, value = 1) {
    await this.increment(field, -value);
  }

  async append(field, value) {
    if (!isAlphanumeric(field)) {
      throw new HotaruError(HotaruError.NON_ALPHANUMERIC_FIELD_NAME);
    }

    if (this._data[field] === undefined) {
      this._data[field] = [];
    }
    if (!Array.isArray(this._data[field])) {
      throw new HotaruError(HotaruError.CAN_ONLY_APPEND_TO_ARRAYS, `${field} is of type ${typeof this._data[field]}`);
    }

    this._data[field].push(value);

    if (this._changelog !== null) {
      this._changelog.push({
        date: new Date(),
        type: 'increment',
        field,
        value,
      });
    }

    if (this._eventListener !== null && this._eventListener.onUserWrite) {
      await this._eventListener.onUserWrite('append', field, value);
    }
  }

  isGuest() {
    return !this._data.email;
  }
}
