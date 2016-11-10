import _ from 'lodash';

export class UserDataStore {
  constructor(data, changelog) {
    this._data = _.cloneDeep(data);
    this._changelog = _.cloneDeep(changelog || []);
  }

  get(field) {
    return this._data[field];
  }

  set(field, value) {
    this._data[field] = value;
  }

  appendChange(change) {
    if (change.type === 'set') {
      this._changelog = this._changelog.filter(c => c.field !== change.field);
    }
    this._changelog.push(change);
  }

  getRawData() {
    return this._data;
  }

  getChangelog() {
    return this._changelog;
  }
}
