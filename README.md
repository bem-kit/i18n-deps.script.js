# i18n-deps.script.js
Add i18n dependencies for blocks which use `BEM.I18N`

Весьма специфичный для Яндекса скрипт для миграции системы сборки (а конкретно формата зависимостей Блоков `*.deps.js`).

Скрипт для проставления зависимостей от i18n для lego и сервисов.

Зависимость от ядра I18N здесь не проставляется, но необходима

## Configure
Fork and change config: levels source, platform regexp.
https://github.com/bem-kit/i18n-deps.script.js/blob/master/index.js#L42-L54

## Usage
`node i18n-deps.js`

#### verbose mode
`node i18n-deps.js debug`

#### print changes to stdout, not modify deps-files
`node i18n-deps.js dry-run`
