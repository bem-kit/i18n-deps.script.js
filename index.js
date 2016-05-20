#!/usr/bin/env node
// Скрипт для проставления зависимостей от i18n для lego и сервисов
// Зависимость от ядра i18n здесь не проставляется, но необходима

// usage:
// node i18n-deps.js debug — log more verbose
// node i18n-deps.js dry-run — print changes to stdout, not modify deps-files
'use strict';

//
// dependencies
//

require('shelljs/global');
const _         = require('lodash');
const includes  = require('array-includes');

const fs        = require('then-fs');
const read      = path => fs.readFile(path, 'utf8');

const Path      = require('path');
const dirname   = path => Path.dirname(path);
const basename  = path => Path.basename(path);
const baseBemName = path => basename(path).match(/^[^.]+/)[0]; // without tech
const isexist   = require('isexist');

const through   = require('through');
const throughPass = fn => through(function(value) { fn(value); this.queue(value); });

const walk      = require('bem-walk');
const bemNaming = require('bem-naming');
const bemParse  = bemNaming.parse;
const bemOmit   = (bemObj, omitParts) => {
    const omitParts_ = _([omitParts])
        .flatten()
        .flatMap(part => part === 'mod' ? ['modVal', 'modName'] : part).value();
    return _.omit(bemObj, omitParts_);
};

const JsonStringifyAsJs = (obj, indent) => JSON.stringify(obj, null, indent || 4).replace(/"(\w+)":/g, '$1:').replace(/: "([^"]+)"/g, ": '$1'");

//
// configuration
//

const config     = require('./config');

const levels     = config.levels;
const techs      = config.techs;
const platformRe = config.platformRe;

const isDebug    = process.argv[2] === 'debug';
const isDryRun   = process.argv[2] === 'dry-run';

//
// functions
//

// simple bem-find
const bemFind = (query, levels, scheme) => {
    const techs  = _.flatten([query.tech]);
    const config = {
        levels: _(levels).invert().mapValues(function() {
            return { scheme: scheme || 'nested' };
        }).value()
    };

    const filterTech = through(json => includes(techs, json.tech) && filterTech.queue(json));
    const pluckPathAndTech = through(json => pluckPathAndTech.queue(_.pick(json, ['path', 'tech'])));

    return walk(levels, config) // returns stream
        .pipe(filterTech)
        .pipe(pluckPathAndTech);
};

const filterI18n = through(fileData => {
    filterI18n.pause();
    read(fileData.path)
        .then(file => {
            filterI18n.resume();
            /BEM\.I18N/.test(file) && filterI18n.queue(fileData)
        })
        .catch(e => {
            console.error('filterI18n reject', e);
            filterI18n.resume().queue();
        });
});


const getI18nUsingFiles = (levels, techs) => {
    // debug
    isDebug && console.log(techs);
    isDebug && console.log(JSON.stringify(levels));

    return bemFind({ tech: techs }, levels)
        .pipe(filterI18n);
};

const processDepsFile = (sourceData) => {
    const sourcePath = sourceData.path;
    const tech       = sourceData.tech;
    const bemName    = baseBemName(sourcePath);
    const bemObj     = bemParse(bemName);
    const bemEntityForNearestI18nDir = findBemEntityForNearestI18nDir(sourcePath);
    const depsFilePath = `${dirname(sourcePath)}/${bemName}.deps.js`;

    read(depsFilePath)
        .then(content => {
            if (!bemEntityForNearestI18nDir) {
                console.log('    ¯\\_(ツ)_/¯ I18N not exist for', sourcePath);
                return content;

            } else if (bemNaming.stringify(bemEntityForNearestI18nDir) !== bemName) {
                console.log('    🔗  Block Ref added', sourcePath);
                return addI18nToDepsFile(content, tech, {i18nRef: bemEntityForNearestI18nDir});

            } else {
                console.log('    🎉  Alright', sourcePath);
                return addI18nToDepsFile(content, tech, {i18nRef: false});
            }
        })
        //todo: сделать никогда правильной работу со стримом
        .then(content => {
            return isDryRun
                ? console.log(sourcePath, tech, depsFilePath, '\n' + content)
                : fs.writeFile(depsFilePath, content, 'utf8');
        })
        .catch((e) => console.error('processDepsFile error', e));
};

const addI18nToDepsFile = (depsFileContent, tech, config) => {
    const tech_ = tech.replace(/\..+$/,'');
    const getReplacement = (ref, indent) => '\n    ' + [
        `tech: '${tech_}'`,
        `shouldDeps: [{${ref}\n        tech: 'i18n'\n    }]`
    ].join(',\n'+' '.repeat(indent || 4)) + '\n';

    const ref = config.i18nRef ? ('\n'+JsonStringifyAsJs(config.i18nRef, 8).replace(/{\n|\n}/g, '')+',') : '';
    
    const depsFileTypes = [
        { match: ']);', replaces: [
            { from: '\n]);', to: `,\n    {${getReplacement(ref, 8)}}]);` },
        ]},
        { match: '});', replaces: [
            { from: '({', to: `([{`},
            { from: '});', to: `}]);`},

            { from: '}]);', to: `},\n{${getReplacement(ref, 4)}}]);` },
        ]},
        { match: '}]);', replaces: [
            { from: '}]);', to: `},\n{${getReplacement(ref, 4)}]);` },
        ]},
    ];

    const escRexp = str => str.replace(/([()\[\]])/g, '\\$1');

    return (content =>
        depsFileTypes
            // select one depsFileType and get replaces for it
            .filter(conf => content.match(escRexp(conf.match)))[0].replaces
            // apply replaces
            .reduce((content, replace) => content.replace(replace.from, replace.to), content)
    )(depsFileContent);
};

// todo: Учитывать так же *.{js,bemhtml,priv}-i18n/
// returns {?BemName}
const findBemEntityForNearestI18nDir = (sourcePath) => {
    const sourcePaths = [sourcePath];
    // todo: + touch, deskpad intermediate levels
    if (!/common/.test(sourcePath)) {
        const currentPlatform = sourcePath.match(platformRe)[1];
        sourcePaths.push(sourcePath.replace(currentPlatform, 'common'))//todo
    }

    // check current level with current platform + with common platform
    // for cases when .i18n presents not in current platform level
    return sourcePaths.reduce(function(bemEntityForNearestI18nDir, sourcePath) {
        if (bemEntityForNearestI18nDir) return bemEntityForNearestI18nDir;

        const bemName = baseBemName(sourcePath);
        const bemObj = bemParse(bemName);
        const dir = dirname(sourcePath);
        const checkWithout = omit => {
            const dirUp = '/..'.repeat(omit.length);
            const bemObj_ = bemOmit(bemObj, omit);
            const i18nDir = `${dir}/${dirUp}/${bemNaming.stringify(bemObj_)}.i18n`;
            return isexist(i18nDir) && bemObj_;
        };

        return checkWithout([]) || (() => {
            switch(bemNaming.typeOf(bemObj)) {
                case ('blockMod'):  return checkWithout(['mod']);
                case ('elemMod'):   return checkWithout(['mod'])
                                        || checkWithout(['elem', 'mod']);
                case ('elem'):      return checkWithout(['elem']);
                case ('block'):     return checkWithout([]);
                default: throw 'Этого никогда не должно было произойти 😱 ' + bemObj + ': ' + bemNaming.typeOf(bemObj);
            }
        })();

    }, undefined);
};

//
// Main logic
//

//
// 1 STEP
//
const i18nUsingFilesStream = getI18nUsingFiles(levels, techs);

//
// 2 STEP
//
i18nUsingFilesStream
    .pipe(throughPass(fileData => processDepsFile(fileData)))
    // .pipe(stringify()) // debug paths
    .pipe(through(function (path) { this.queue(isDebug ? JSON.stringify(path)+'\n' : ''); }))
    .pipe(process.stdout);
