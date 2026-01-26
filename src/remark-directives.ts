/**
 * Remark plugin to inject directive imports from frontmatter.
 *
 * @packageDocumentation
 */

import type { Root } from 'mdast'
import type { VFile } from 'vfile'

export interface RemarkDirectivesOptions {
  /**
   * Glob patterns for custom directive source files.
   * Maps directive names to their source modules.
   */
  directiveSources?: Map<string, string>
}

/**
 * Built-in directive name to import mapping.
 */
const BUILTIN_DIRECTIVES: Record<string, { exportName: string; module: string }> = {
  'g-text': { exportName: 'text', module: 'gonia/directives' },
  'g-html': { exportName: 'html', module: 'gonia/directives' },
  'g-show': { exportName: 'show', module: 'gonia/directives' },
  'g-template': { exportName: 'template', module: 'gonia/directives' },
  'g-slot': { exportName: 'slot', module: 'gonia/directives' },
  'g-class': { exportName: 'cclass', module: 'gonia/directives' },
  'g-model': { exportName: 'model', module: 'gonia/directives' },
  'g-on': { exportName: 'on', module: 'gonia/directives' },
  'g-for': { exportName: 'cfor', module: 'gonia/directives' },
  'g-if': { exportName: 'cif', module: 'gonia/directives' },
  'text': { exportName: 'text', module: 'gonia/directives' },
  'html': { exportName: 'html', module: 'gonia/directives' },
  'show': { exportName: 'show', module: 'gonia/directives' },
  'template': { exportName: 'template', module: 'gonia/directives' },
  'slot': { exportName: 'slot', module: 'gonia/directives' },
  'class': { exportName: 'cclass', module: 'gonia/directives' },
  'model': { exportName: 'model', module: 'gonia/directives' },
  'on': { exportName: 'on', module: 'gonia/directives' },
  'for': { exportName: 'cfor', module: 'gonia/directives' },
  'if': { exportName: 'cif', module: 'gonia/directives' },
}

/**
 * Generate import statements for directives.
 */
function generateImports(
  directiveNames: string[],
  customSources?: Map<string, string>
): string {
  const builtinImports: string[] = []
  const customImports: string[] = []

  for (const name of directiveNames) {
    const builtin = BUILTIN_DIRECTIVES[name]
    if (builtin) {
      if (!builtinImports.includes(builtin.exportName)) {
        builtinImports.push(builtin.exportName)
      }
      continue
    }

    if (customSources?.has(name)) {
      const module = customSources.get(name)!
      customImports.push(`import '${module}';`)
    }
  }

  const statements: string[] = []

  if (builtinImports.length > 0) {
    statements.push(`import { ${builtinImports.join(', ')} } from 'gonia/directives';`)
  }

  statements.push(...customImports)

  return statements.join('\n')
}

/**
 * Remark plugin that reads directive declarations from frontmatter
 * and injects the necessary imports.
 *
 * @example
 * ```yaml
 * ---
 * directive:
 *   - my-chart
 *   - g-model
 * ---
 * ```
 */
export function remarkDirectives(options: RemarkDirectivesOptions = {}) {
  return (tree: Root, file: VFile) => {
    const frontmatter = file.data.astro?.frontmatter as Record<string, unknown> | undefined

    if (!frontmatter) {
      return
    }

    // Support both 'directive' and 'directives' keys
    const directives = frontmatter.directive ?? frontmatter.directives

    if (!directives) {
      return
    }

    // Normalize to array
    const directiveList: string[] = Array.isArray(directives)
      ? directives
      : [directives as string]

    if (directiveList.length === 0) {
      return
    }

    const imports = generateImports(directiveList, options.directiveSources)

    if (!imports) {
      return
    }

    // Inject as raw HTML script at the start of the document
    tree.children.unshift({
      type: 'html',
      value: `<script type="module">\n${imports}\n</script>`
    })
  }
}

export default remarkDirectives
