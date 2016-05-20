const _ = require('lodash');

// Levels source example: yandex github /lego/islands/blob/dev/index.js
const getLevels  = require('.').getLevels;

module.exports = {
  levels: _(getLevels()).values().flatten().map('path').uniq().value(),
  techs: ['js', 'bemhtml.js'],
  platformRe: /([a-zA-Z-]+)\.blocks/,
};
