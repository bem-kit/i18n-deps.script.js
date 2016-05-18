# i18n-deps.script.js
Add i18n dependencies for blocks which use `BEM.I18N`

Скрипт для проставления зависимостей от i18n для lego и сервисов
Зависимость от ядра i18n здесь не проставляется, но необходима

## usage
`node i18n-deps.js debug # log more verbose`

`node i18n-deps.js dry-run # print changes to stdout, not modify deps-files`
