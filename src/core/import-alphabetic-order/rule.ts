import type { Rule } from 'eslint'
import type { ImportDeclaration } from 'estree'

/**
 * Функция-предикат "Аргумент - пустая строка?".
 * @param s произвольная строка
 */
function isEmptyString(s: string): boolean {
  return s.length === 0
}

/**
 * ESLint-правило, контролирующее соответствие порядка импортов в файле
 * обратному алфавитному.
 * @constant
 */
const RULE_MODULE: Rule.RuleModule = {
  meta: {
    docs: {
      description:
        'Правило позволяет "заставить" разработчика упорядочить импорт файлов в обратном алфавитном порядке'
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [],
    type: 'layout'
  },
  create(context) {
    return {
      Program(node) {
        /**
         * Импорты.
         * @constant
         */
        const imports = node.body.filter(
          (it) => it.type === 'ImportDeclaration' && typeof it.source.value === 'string'
        ) as ImportDeclaration[]
        /**
         * Импорты, отсортированные в обратном алфавитном порядке.
         * @constant
         */
        const sortedImports = imports.slice().sort((a, b) => {
          const isCustomModule = /^\./
          const isNodeModule = /^[a-z]/
          // Безопасные утверждения типа: см. выше функцию-предикат,
          // переданную в метод filter.
          const valueA = a.source.value as string
          const valueB = b.source.value as string
          if (
            (isCustomModule.test(valueA) && isCustomModule.test(valueB)) ||
            (isNodeModule.test(valueA) && isNodeModule.test(valueB))
          ) {
            return valueA > valueB ? 1 : -1
          }
          return valueA > valueB ? -1 : 1
        })

        imports.forEach((it, idx) => {
          // Безопасное утверждение типа "non-null-assertion".
          const expectedImport = sortedImports[idx]!

          if (it !== expectedImport) {
            context.report({
              node: it,
              message: 'Необходимо расположить импорты в алфавитном порядке',
              fix(fixer) {
                /**
                 * Импорт по умолчанию.
                 * @constant
                 */
                const defaultSpec = expectedImport.specifiers.find(
                  ({ type }) => type === 'ImportDefaultSpecifier'
                )
                /**
                 * Идентификатор импорта по умолчанию.
                 * @constant
                 */
                const defaultSpecName = defaultSpec?.local.name ?? ''
                /**
                 * Импорты, исключая импорт по умолчанию.
                 * @constant
                 */
                const restSpecs =
                  defaultSpec !== undefined
                    ? expectedImport.specifiers.filter((spec) => spec !== defaultSpec)
                    : expectedImport.specifiers
                /**
                 * Идентификаторы импортов, исключая импорт по умолчанию.
                 * @constant
                 */
                const restSpecNames = restSpecs.map((spec) => spec.local.name).join(', ')
                let expectedSpec = ''

                if (!isEmptyString(defaultSpecName)) {
                  expectedSpec += defaultSpecName
                }
                if (!isEmptyString(restSpecNames)) {
                  expectedSpec += `${isEmptyString(expectedSpec) ? '' : ', '}{ ${restSpecNames} }`
                }
                if (Array.isArray(it.range)) {
                  const [start, end] = it.range

                  return [
                    fixer.replaceTextRange(
                      [start, end],
                      // Безопасное утверждения типа: см. комментарии к
                      // константе sortedImports.
                      `import ${expectedSpec} from '${expectedImport.source.value as string}'`
                    )
                  ]
                }

                return null
              }
            })
          }
        })
      }
    }
  }
}

export default RULE_MODULE
