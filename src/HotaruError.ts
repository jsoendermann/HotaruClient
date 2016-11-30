interface ErrorData {
  name: string;
  code: number;
  message: string
}

const errorData = require('../errors.json') as ErrorData[];

const errorDataWithName = (name: string): ErrorData => errorData.find(d => d.name === name);
const errorDataWithCode = (code: number): ErrorData => errorData.find(d => d.code === code);


export class HotaruError extends Error {
  public name: string;
  public code: number;

  constructor(identifier: string | number, details?: string) {
    let errorData: ErrorData;

    if (typeof identifier === 'string') {
      errorData = errorDataWithName(identifier)
    } else if (typeof identifier === 'number') {
      errorData = errorDataWithCode(identifier)
    }

    let message = '';

    if (details) {
      message = `${errorData.message} (${details})`;
    } else {
      message = errorData.message;
    }

    super(message);

    this.name = errorData.name;
    this.code = errorData.code;
  }
}