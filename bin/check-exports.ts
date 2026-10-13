/**
 * Verifies that every `index.ts` barrel file re-exports all of its siblings,
 * and — when `useEsm` is set — that it does so through runtime-resolvable
 * specifiers.
 *
 * A module that is never re-exported by its parent barrel is invisible to
 * consumers of the published package, even though it compiles fine. An
 * extensionless specifier is just as invisible: the emitted ESM keeps it
 * verbatim, so Node throws `ERR_MODULE_NOT_FOUND` at import time. This script
 * is therefore run before `build` so either mistake fails the build instead of
 * shipping a broken public API.
 *
 * Usage: `tsx bin/check-exports.ts [--fix]`, where `--fix` appends the missing
 * `export * from` statements to the barrels and rewrites the specifiers that
 * lack a `.js` extension, instead of failing.
 */
import chalk from 'chalk';
import { isNil } from 'lodash-es';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import ts from 'typescript';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Directory that is walked, relative to the project root. */
const sourceRoot = 'src';

const {
  values: { fix: shouldFix, esm: useEsm },
} = parseArgs({
  args: process.argv.slice(2),
  options: {
    // Whether missing exports are written to the barrels instead of reported.
    fix: {
      type: 'boolean',
      default: false,
    },
    // Whether to add extensions to exports
    esm: {
      type: 'boolean',
      default: true,
    },
  },
});

/**
 * Glob patterns of files and directories that are not expected to be exported.
 * Patterns are matched against project-root relative, posix-style paths.
 * Supported wildcards: `**`, `*` and `?`.
 */
const excluded: string[] = [
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.d.ts',
  '**/__testutils__/**',
  '**/__snapshots__/**',
  '**/__mocks__/**',
  '**/mock*.ts',
];

/** File extensions that are considered exportable modules. */
const moduleExtensions = ['.ts', '.tsx'];

/** Extensions a runtime accepts verbatim in an ESM specifier. */
const runtimeExtensions = ['.js', '.mjs', '.cjs', '.json', '.node'];

/** Half-open range of an expression in the source text of its file. */
interface Range {
  start: number;
  end: number;
}

interface Reexport {
  /** The module specifier as written, e.g. `./utils.js`. */
  specifier: string;
  /** Range of the specifier's string literal, quotes included. */
  range: Range;
  /** Absolute path of the file the specifier resolves to, if it resolves. */
  resolvedFileName?: string;
  /** Whether this is a `export * from` / `export * as ns from` statement. */
  isWildcard: boolean;
}

interface Problem {
  /** Project-root relative path of the barrel file. */
  barrel: string;
  /** Specifier that should be added, e.g. `'./utils.js'`. */
  specifier: string;
  /** Project-root relative path of the module that is not exported. */
  target: string;
}

interface ExtensionProblem {
  /** Project-root relative path of the barrel file. */
  barrel: string;
  /** The specifier as written, e.g. `./utils`. */
  specifier: string;
  /** The specifier it should be rewritten to, e.g. `./utils.js`. */
  expected: string;
  /** Range of the specifier's string literal, quotes included. */
  range: Range;
}

/** The project's compiler options, so module resolution honours `paths`. */
const compilerOptions = ((): ts.CompilerOptions => {
  const tsconfigPath = join(projectRoot, 'tsconfig.json');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { config } = ts.readConfigFile(tsconfigPath, input =>
    ts.sys.readFile(input)
  );

  return ts.parseJsonConfigFileContent(config, ts.sys, projectRoot).options;
})();

const moduleResolutionCache = ts.createModuleResolutionCache(
  projectRoot,
  fileName => fileName,
  compilerOptions
);

/** Converts a glob pattern into an anchored regular expression. */
function globToRegExp(pattern: string): RegExp {
  let source = '';

  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];

    if (char === '*') {
      if (pattern[index + 1] === '*') {
        // `**/` may span zero or more directories, a bare `**` any characters.
        if (pattern[index + 2] === '/') {
          source += '(?:.*/)?';
          index += 2;
        } else {
          source += '.*';
          index += 1;
        }
        continue;
      }
      source += '[^/]*';
      continue;
    }

    source += char === '?' ? '[^/]' : char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }

  return new RegExp(`^${source}$`);
}

const excludedMatchers = excluded.map(globToRegExp);

/** Project-root relative, posix-style path of an absolute path. */
function toRelativePath(absolutePath: string): string {
  return relative(projectRoot, absolutePath).split(/[\\/]/).join('/');
}

function isExcluded(absolutePath: string, isDirectory: boolean): boolean {
  const path = toRelativePath(absolutePath);
  const candidates = isDirectory ? [path, `${path}/`] : [path];

  return excludedMatchers.some(matcher =>
    candidates.some(candidate => matcher.test(candidate))
  );
}

function isModuleFile(name: string): boolean {
  return moduleExtensions.some(extension => name.endsWith(extension));
}

function barrelPathOf(directory: string): string | undefined {
  return moduleExtensions
    .map(extension => join(directory, `index${extension}`))
    .find(path => existsSync(path));
}

/**
 * Collects every `export ... from '<specifier>'` in a barrel, resolved to the
 * file it points at. Parsing with the compiler rather than by hand means
 * comments, multi-line clauses and `paths` aliases are all handled correctly.
 */
function collectReexports(barrelPath: string): Reexport[] {
  const source = ts.createSourceFile(
    barrelPath,
    ts.sys.readFile(barrelPath) ?? '',
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    ts.ScriptKind.TS
  );

  return source.statements.flatMap(statement => {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.moduleSpecifier === undefined ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      return [];

    const { resolvedModule } = ts.resolveModuleName(
      statement.moduleSpecifier.text,
      barrelPath,
      compilerOptions,
      ts.sys,
      moduleResolutionCache
    );

    return [
      {
        specifier: statement.moduleSpecifier.text,
        range: {
          start: statement.moduleSpecifier.getStart(source),
          end: statement.moduleSpecifier.end,
        },
        // A specifier that does not resolve is still worth reporting on, so it
        // is kept rather than dropped.
        resolvedFileName:
          resolvedModule && resolve(resolvedModule.resolvedFileName),
        // `export * from` and `export * as ns from` re-export everything;
        // an `export { a, b } from` clause only covers what it names.
        isWildcard:
          isNil(statement.exportClause) ||
          ts.isNamespaceExport(statement.exportClause),
      },
    ];
  });
}

/**
 * The module specifier a barrel in `directory` should use to re-export
 * `target`. Under ESM a subdirectory cannot be referenced by its name alone:
 * the barrel inside it has to be spelled out in full.
 */
function specifierFor(target: string, directory: string): string {
  const targetDirectory = dirname(target);
  const name = basenameWithoutExtension(target);

  if (targetDirectory === directory) return `./${name}${useEsm ? '.js' : ''}`;

  const directoryName = basenameWithoutExtension(targetDirectory);

  return useEsm ? `./${directoryName}/${name}.js` : `./${directoryName}`;
}

/**
 * The ESM-resolvable form of a re-export's specifier, or `undefined` when it
 * needs no rewriting. Only relative specifiers are checked — a bare specifier
 * is resolved by the importing runtime through `node_modules` or the package's
 * own `exports` map, where no extension is expected.
 */
function esmSpecifierOf({
  specifier,
  resolvedFileName,
}: Reexport): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  if (runtimeExtensions.some(extension => specifier.endsWith(extension)))
    return undefined;

  // `./utils.ts` is no more resolvable at runtime than `./utils` is: both have
  // to point at the emitted `.js` file.
  const base = specifier.replace(/\.(ts|tsx|mts|cts)$/, '');

  // A bare directory specifier resolves to that directory's barrel, so the
  // extension alone is not enough to make it resolvable.
  const isDirectory =
    resolvedFileName !== undefined &&
    /[\\/]index\.tsx?$/.test(resolvedFileName) &&
    !/(^|[\\/])index$/.test(base);

  return `${base}${isDirectory ? '/index' : ''}.js`;
}

const success = (message: string) => {
  console.log(chalk.green(message));
};
const error = (message: string): void => {
  console.log(chalk.red(message));
};
const warn = (message: string): void => {
  console.log(chalk.yellow(message));
};

const problems: Problem[] = [];
const partialExports: Problem[] = [];
const extensionProblems: ExtensionProblem[] = [];
const unbarrelledDirectories: string[] = [];

/** Checks a single directory and recurses into its subdirectories. */
function checkDirectory(directory: string): void {
  const entries = readdirSync(directory, { withFileTypes: true });

  const files = entries
    .filter(entry => entry.isFile() && isModuleFile(entry.name))
    .map(entry => join(directory, entry.name))
    .filter(path => !isExcluded(path, false));

  const directories = entries
    .filter(entry => entry.isDirectory())
    .map(entry => join(directory, entry.name))
    .filter(path => !isExcluded(path, true));

  const barrelPath = barrelPathOf(directory);

  if (barrelPath) {
    const reexports = collectReexports(barrelPath);

    // Every sibling module, plus every subdirectory that has a barrel of its
    // own, is expected to be reachable from this barrel.
    const expected = [
      ...files.filter(path => path !== barrelPath),
      ...directories.flatMap(path => barrelPathOf(path) ?? []),
    ];
    expected.forEach(target => {
      const matches = reexports.filter(
        reexport => reexport.resolvedFileName === target
      );
      if (matches.some(reexport => reexport.isWildcard)) return;

      const problem: Problem = {
        barrel: toRelativePath(barrelPath),
        specifier: specifierFor(target, directory),
        target: toRelativePath(target),
      };

      // A named re-export covers the module, but silently drops any member
      // added to it later, so it is reported separately as a warning.
      (matches.length > 0 ? partialExports : problems).push(problem);
    });

    if (useEsm) {
      reexports.forEach(reexport => {
        const expectedSpecifier = esmSpecifierOf(reexport);
        if (isNil(expectedSpecifier)) return;

        extensionProblems.push({
          barrel: toRelativePath(barrelPath),
          specifier: reexport.specifier,
          expected: expectedSpecifier,
          range: reexport.range,
        });
      });
    }
  } else if (directory !== join(projectRoot, sourceRoot) && files.length > 0) {
    unbarrelledDirectories.push(toRelativePath(directory));
  }

  directories.forEach(checkDirectory);
}

function basenameWithoutExtension(path: string): string {
  return (path.split(/[\\/]/).at(-1) ?? '').replace(/\.(ts|tsx)$/, '');
}

/**
 * Appends the missing `export * from` statements to a barrel, directly after
 * the last re-export it already has so the existing ordering is preserved.
 */
function addExports(barrel: string, specifiers: string[]): void {
  const barrelPath = resolve(projectRoot, barrel);
  const original = ts.sys.readFile(barrelPath) ?? '';
  const statements = specifiers
    .map(specifier => `export * from '${specifier}';`)
    .join('\n')
    .concat('\n');

  const source = ts.createSourceFile(
    barrelPath,
    original,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    ts.ScriptKind.TS
  );

  const lastReexport = source.statements
    .filter(ts.isExportDeclaration)
    .filter(statement => statement.moduleSpecifier !== undefined)
    .at(-1);

  if (!lastReexport) {
    const body = original.replace(/\s*$/, '');
    ts.sys.writeFile(barrelPath, body ? `${body}\n${statements}` : statements);
    return;
  }

  ts.sys.writeFile(
    barrelPath,
    `${original.slice(0, lastReexport.end)}\n${statements}${original
      .slice(lastReexport.end)
      .replace(/^\n/, '')}`
  );
}

/**
 * Rewrites the specifiers of a barrel in place, leaving the rest of the file —
 * its export clauses, comments and formatting — untouched.
 */
function fixSpecifiers(barrel: string, items: ExtensionProblem[]): void {
  const barrelPath = resolve(projectRoot, barrel);
  const original = ts.sys.readFile(barrelPath) ?? '';

  // Applied back to front, so an earlier replacement cannot shift the range of
  // a later one.
  const fixed = [...items]
    .sort((left, right) => right.range.start - left.range.start)
    .reduce((text, { range, expected }) => {
      const quote = text[range.start] === '"' ? '"' : "'";

      return `${text.slice(0, range.start)}${quote}${expected}${quote}${text.slice(range.end)}`;
    }, original);
  ts.sys.writeFile(barrelPath, fixed);
}

function groupByBarrel<T extends { barrel: string }>(
  items: T[]
): Map<string, T[]> {
  const group = new Map<string, T[]>();
  items.forEach(item => {
    const existing = group.get(item.barrel);
    if (existing) {
      existing.push(item);
    } else {
      group.set(item.barrel, [item]);
    }
  });

  return group;
}

checkDirectory(join(projectRoot, sourceRoot));

for (const [barrel, items] of groupByBarrel(partialExports)) {
  warn(`⚠ ${barrel} only re-exports named members of:`);
  for (const { target, specifier } of items)
    warn(`    ${target} — consider \`export * from '${specifier}';\``);
}

for (const directory of unbarrelledDirectories) {
  warn(`⚠ ${directory} has no index.ts, so it is not part of the API`);
}

if (problems.length === 0 && extensionProblems.length === 0) {
  success(
    useEsm ?
      '✔ All index.ts files export their siblings with a .js extension'
    : '✔ All index.ts files export their siblings'
  );
  process.exit(0);
}

if (shouldFix) {
  // Specifiers are rewritten first: their ranges come from the barrel as it is
  // on disk now, and appending statements would invalidate them.
  for (const [barrel, items] of groupByBarrel(extensionProblems)) {
    fixSpecifiers(barrel, items);

    success(`✔ ${barrel} — fixed ${items.length} specifier(s):`);
    for (const { specifier, expected } of items)
      success(`    '${specifier}' → '${expected}'`);
  }

  for (const [barrel, items] of groupByBarrel(problems)) {
    // Duplicate specifiers cannot occur: a barrel is only ever missing one
    // statement per sibling, and siblings have unique names.
    addExports(
      barrel,
      items.map(({ specifier }) => specifier)
    );

    success(`✔ ${barrel} — added ${items.length} export(s):`);
    for (const { specifier } of items)
      success(`    export * from '${specifier}';`);
  }

  success(
    `\n${problems.length} missing export(s) added, ${extensionProblems.length} specifier(s) fixed.`
  );
  process.exit(0);
}

for (const [barrel, items] of groupByBarrel(problems)) {
  error(`\n✖ ${barrel} is missing ${items.length} export(s):`);
  for (const { target, specifier } of items)
    error(
      `    ${chalk.underline(target)} — add \`export * from '${specifier}';\``
    );
}

for (const [barrel, items] of groupByBarrel(extensionProblems)) {
  error(
    `\n✖ ${barrel} has ${items.length} specifier(s) that ESM cannot resolve:`
  );
  for (const { specifier, expected } of items)
    error(`    ${chalk.underline(specifier)} — use \`'${expected}'\``);
}

error(
  `\n${problems.length} missing export(s) and ${extensionProblems.length} unresolvable specifier(s). Run with --fix to correct them, or add the files to the exclusion list in bin/check-exports.ts.`
);
process.exit(1);
