import * as _ from 'lodash';
import { UserChange } from './HotaruUser';

export interface IUserDataStore {
  get: (field: string) => any;
  set: (field: string, value: any) => void;
  appendChange: (change: UserChange) => void;
}

export class UserDataStore {
  private data: { [field: string]: any };
  private changelog: UserChange[]

  constructor(data: { [field: string]: any }, changelog: UserChange[]) {
    this.data = _.cloneDeep(data);
    this.changelog = _.cloneDeep(changelog || []);
  }

  get(field: string): any {
    return this.data[field];
  }

  set(field: string, value: any) {
    this.data[field] = value;
  }

  appendChange(change: UserChange) {
    if (change.type === 'set') {
      this.changelog = this.changelog.filter(c => c.field !== change.field);
    }
    this.changelog.push(change);
  }

  getRawData(): any {
    return this.data;
  }

  getChangelog(): UserChange[] {
    return this.changelog;
  }
}
