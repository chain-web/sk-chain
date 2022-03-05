import { execCode } from 'lib/contract/runtime';
import { bytes } from 'multiformats';

const code = `
  console.log('trans')
`;

//demo
execCode(bytes.fromString(code));
