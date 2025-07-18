// explode a 'string' into a regex /\x73.*\x74.*\x72.*\x69.*\x6e.*\x67/i
export const explode = (str: string) =>
  new RegExp(
    str
      .split('')
      .map(c => c.charCodeAt(0))
      .map(c => '\\x' + (c < 16 ? '0' : '') + c.toString(16))
      .join('.*'),
    'i',
  );
