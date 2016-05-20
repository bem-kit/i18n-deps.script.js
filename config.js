const _ = require('lodash');

// Levels source example: yandex github /lego/islands/blob/dev/index.js
// example getLevels() from lego:
({ desktop:
   [ { path: '/Users/invntrm/lego/islands/common.blocks',
       check: true },
     { path: '/Users/invntrm/lego/islands/desktop.blocks',
       check: true } ],
  'touch-phone':
   [ { path: '/Users/invntrm/lego/islands/common.blocks',
       check: true },
     { path: '/Users/invntrm/lego/islands/touch.blocks',
       check: true },
     { path: '/Users/invntrm/lego/islands/touch-phone.blocks',
       check: true } ],
  'touch-pad':
   [ { path: '/Users/invntrm/lego/islands/common.blocks',
       check: true },
     { path: '/Users/invntrm/lego/islands/touch.blocks',
       check: true },
     { path: '/Users/invntrm/lego/islands/touch-pad.blocks',
       check: true } ] });

const getLevels  = require('.').getLevels; // . = project root

module.exports = {
  levels: _(getLevels()).values().flatten().map('path').uniq().value(),
  techs: ['js', 'bemhtml.js'],
  platformRe: /([a-zA-Z-]+)\.blocks/,
};
