const errorData = require('../errors.json');

const messageWithCode = code => errorData.find(d => d.code === code).message;

export default class HotaruError extends Error {
  constructor(code, details) {
    let message = '';

    if (details) {
      message = `${messageWithCode(code)} (${details})`;
    } else {
      message = messageWithCode(code);
    }

    super(message);

    this.code = code;
  }
}

errorData.forEach(({ name, code }) => {
  HotaruError[name] = code;
});
