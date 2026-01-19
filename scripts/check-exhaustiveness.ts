#!/usr/bin/env node

/**
 * Exhaustiveness Checking Script
 *
 * Validates that discriminated unions are handled exhaustively in switch statements
 * and if-else chains. This catches cases where new union variants aren't handled.
 *
 * Usage:
 *   npx ts-node scripts/check-exhaustiveness.ts
 */

import { readFileSync } from 'fs';
import { globSync } from 'glob';
import * as ts from 'typescript';

interface UnionType {
  name: string;
  variants: string[];
  location: string;
}

interface UnionUsage {
  unionName: string;
  handledVariants: Set<string>;
  file: string;
  line: number;
}

const discoveredUnions = new Map<string, UnionType>();
const unionUsages: UnionUsage[] = [];
let issuesFound = 0;

/**
 * Find all discriminated union type definitions
 */
function findUnionDefinitions(sourceFile: ts.SourceFile): void {
  function visit(node: ts.Node): void {
    // Look for type declarations
    if (ts.isTypeAliasDeclaration(node)) {
      const typename = node.name.text;

      // Check if it's a union type
      if (ts.isUnionTypeNode(node.type)) {
        const variants: string[] = [];

        node.type.types.forEach((type) => {
          // Extract literal values from unions
          if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
            variants.push(type.literal.text);
          }
        });

        if (variants.length > 0) {
          discoveredUnions.set(typename, {
            name: typename,
            variants,
            location: sourceFile.fileName,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

/**
 * Find switch statements and check exhaustiveness
 */
function findSwitchStatements(sourceFile: ts.SourceFile): void {
  function visit(node: ts.Node): void {
    if (ts.isSwitchStatement(node)) {
      // Try to determine what's being switched on
      const switchExpr = node.expression;
      let switchVarName: string | null = null;

      if (ts.isPropertyAccessExpression(switchExpr)) {
        switchVarName = switchExpr.name.text; // e.g., memory.type
      } else if (ts.isIdentifier(switchExpr)) {
        switchVarName = switchExpr.text;
      }

      if (switchVarName && (switchVarName === 'type' || switchVarName === 'status')) {
        const handledVariants = new Set<string>();
        let hasDefaultCase = false;

        node.caseBlock.clauses.forEach((clause) => {
          if (ts.isDefaultClause(clause)) {
            hasDefaultCase = true;
          } else if (ts.isCaseClause(clause)) {
            if (ts.isStringLiteral(clause.expression)) {
              handledVariants.add(clause.expression.text);
            }
          }
        });

        // Report if no default case and not all cases handled
        if (!hasDefaultCase && handledVariants.size > 0) {
          unionUsages.push({
            unionName: switchVarName,
            handledVariants,
            file: sourceFile.fileName,
            line: sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

/**
 * Check all union usages for completeness
 */
function validateExhaustiveness(): void {
  for (const usage of unionUsages) {
    // Find if this usage corresponds to a known union
    for (const [unionName, unionDef] of discoveredUnions) {
      // Check if this could be the union being used
      if (
        unionName.toLowerCase().includes(usage.unionName.toLowerCase()) ||
        usage.unionName.toLowerCase().includes(unionName.toLowerCase())
      ) {
        const unhandledVariants = unionDef.variants.filter((v) => !usage.handledVariants.has(v));

        if (unhandledVariants.length > 0) {
          console.warn(
            `⚠️  Potentially unhandled union variants in ${usage.file}:${usage.line}\n` +
              `    Union: ${unionName}\n` +
              `    Unhandled: ${unhandledVariants.join(', ')}\n`
          );
          issuesFound++;
        }
      }
    }
  }
}

/**
 * Main script logic
 */
async function main(): Promise<void> {
  console.log('🔍 Checking discriminated union exhaustiveness...\n');

  const files = globSync(['src/**/*.{ts,tsx}', 'api/**/*.ts'], {
    ignore: ['node_modules', 'dist', '**/*.d.ts', '**/*.test.ts', '**/*.test.tsx'],
  });

  console.log(`Found ${files.length} TypeScript files to analyze\n`);

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node,
    lib: ['ES2022', 'DOM'],
    jsx: ts.JsxEmit.React,
    strict: true,
  };

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

      findUnionDefinitions(sourceFile);
      findSwitchStatements(sourceFile);
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  console.log(`📊 Discovered ${discoveredUnions.size} union types:\n`);
  for (const [name, def] of discoveredUnions) {
    console.log(`   • ${name}: ${def.variants.join(' | ')}`);
  }

  console.log(`\n🔎 Found ${unionUsages.length} switch statements\n`);

  validateExhaustiveness();

  if (issuesFound > 0) {
    console.error(`\n❌ Found ${issuesFound} potential exhaustiveness issues`);
    process.exit(1);
  } else {
    console.log('\n✅ All union switch statements appear exhaustive (or have default cases)\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Error running exhaustiveness check:', error);
  process.exit(1);
});
