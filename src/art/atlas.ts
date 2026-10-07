import c00 from './chunk00';
import c01 from './chunk01';
import c02 from './chunk02';
import c03 from './chunk03';
import c04 from './chunk04';
import c05 from './chunk05';
import c06 from './chunk06';
import c07 from './chunk07';
import c08 from './chunk08';
import c09 from './chunk09';

export const ATLAS_DATA_URI = 'data:image/webp;base64,' + [
  c00, c01, c02, c03, c04, c05, c06, c07, c08, c09
].join('');

export const ATLAS_WIDTH = 512;
export const ATLAS_HEIGHT = 576;
export const FRAME_WIDTH = 512;
export const FRAME_HEIGHT = 288;
