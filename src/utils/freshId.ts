const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function freshId(length: number = 15): string {
  if (length < 1) {
    throw new Error('Ids must be at least one character long');
  }

  let id = '';

  for (let i = 0; i < length; i++) {
    id += ALPHANUM.charAt(Math.floor(Math.random() * ALPHANUM.length));
  }

  return id;
}
