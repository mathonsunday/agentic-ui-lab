#!/usr/bin/env tsx
/**
 * Test Smell Detector
 *
 * Scans test files for low-value test patterns that are unlikely to catch bugs.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface TestSmell {
  type: string;
  severity: 'low' | 'medium' | 'high';
  file: string;
  line: number;
  snippet: string;
  reason: string;
}

const TEST_SMELL_PATTERNS = [
  {
    name: 'trivial-truthy',
    regex: /expect\([^)]+\)\.toBeTruthy\(\)/,
    severity: 'high' as const,
    reason: 'Only checks if value exists, not its behavior',
  },
  {
    name: 'trivial-defined',
    regex: /expect\([^)]+\)\.toBeDefined\(\)/,
    severity: 'high' as const,
    reason: 'Only checks if value is defined, TypeScript already does this',
  },
  {
    name: 'type-check-only',
    regex: /expect\(typeof\s+[^)]+\)\.toBe\(['"](string|number|boolean|object)['"]\)/,
    severity: 'high' as const,
    reason: 'Only checks type, TypeScript already enforces this',
  },
  {
    name: 'callback-called-only',
    regex: /expect\([^)]+\)\.toHaveBeenCalled\(\)[\s\S]{0,50}$/, // No more assertions after
    severity: 'medium' as const,
    reason: 'Only checks callback was called, not what it did',
  },
  {
    name: 'renders-without-crash',
    regex: /it\([^,]+,.*\{\s*(?:const\s+\{[^}]+\}\s*=\s*)?render\([^)]+\);?\s*\}\)/s,
    severity: 'medium' as const,
    reason: 'Only checks component renders, not its behavior',
  },
];

function findTestFiles(dir: string): string[] {
  const files: string[] = [];

  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('dist')) {
      files.push(...findTestFiles(fullPath));
    } else if (item.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) {
      files.push(fullPath);
    }
  }

  return files;
}

function detectSmells(file: string): TestSmell[] {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const smells: TestSmell[] = [];

  for (const pattern of TEST_SMELL_PATTERNS) {
    const matches = content.matchAll(new RegExp(pattern.regex.source, 'gm'));

    for (const match of matches) {
      const matchIndex = match.index!;
      const lineNumber = content.substring(0, matchIndex).split('\n').length;
      const snippet = lines[lineNumber - 1].trim();

      smells.push({
        type: pattern.name,
        severity: pattern.severity,
        file,
        line: lineNumber,
        snippet: snippet.substring(0, 80),
        reason: pattern.reason,
      });
    }
  }

  return smells;
}

function analyzeTestFile(file: string): { totalTests: number; assertions: number; singleAssertion: number } {
  const content = readFileSync(file, 'utf-8');

  const testMatches = content.match(/\s+it\(/g) || [];
  const assertionMatches = content.match(/expect\(/g) || [];

  // Rough heuristic: tests with <= 1 assertion are suspicious
  const testsPerAssertion = assertionMatches.length / testMatches.length;
  const suspiciouslyLow = testsPerAssertion < 1.5;

  return {
    totalTests: testMatches.length,
    assertions: assertionMatches.length,
    singleAssertion: suspiciouslyLow ? testMatches.length : 0,
  };
}

// Main execution
const srcDir = process.argv[2] || './src';
const apiDir = process.argv[3] || './api';

console.log('🔍 Scanning for test smells...\n');

const testFiles = [...findTestFiles(srcDir), ...findTestFiles(apiDir)];
console.log(`Found ${testFiles.length} test files\n`);

let totalSmells = 0;
const smellsByType: Record<string, number> = {};
const smellsByFile: Record<string, TestSmell[]> = {};

for (const file of testFiles) {
  const smells = detectSmells(file);
  const stats = analyzeTestFile(file);

  if (smells.length > 0) {
    smellsByFile[file] = smells;
    totalSmells += smells.length;

    for (const smell of smells) {
      smellsByType[smell.type] = (smellsByType[smell.type] || 0) + 1;
    }
  }
}

// Report
console.log('📊 Summary\n');
console.log(`Total test smells found: ${totalSmells}\n`);

if (totalSmells === 0) {
  console.log('✅ No obvious test smells detected!');
  process.exit(0);
}

console.log('By type:');
for (const [type, count] of Object.entries(smellsByType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count}`);
}

console.log('\n📝 Details:\n');

for (const [file, smells] of Object.entries(smellsByFile)) {
  console.log(`\n${file}:`);
  for (const smell of smells.slice(0, 3)) {  // Show first 3 per file
    console.log(`  Line ${smell.line}: ${smell.snippet}`);
    console.log(`    → ${smell.reason}`);
  }
  if (smells.length > 3) {
    console.log(`  ... and ${smells.length - 3} more`);
  }
}

console.log('\n💡 Recommendation:');
console.log('Review these tests to see if they would catch bugs if you refactored the code.');
