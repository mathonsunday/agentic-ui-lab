#!/usr/bin/env node
/**
 * Create a new Architecture Decision Record (ADR)
 *
 * Usage:
 *   node scripts/create-adr.js --title "Use Jotai for state management" \
 *     --context "Needed global state..." \
 *     --decision "Use Jotai..." \
 *     --rationale "Minimal boilerplate,React 19 compatible" \
 *     --consequences "Less mature ecosystem" \
 *     --alternatives "Redux: Too much boilerplate"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADR_DIR = path.join(__dirname, '../docs/adrs');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    title: '',
    context: '',
    decision: '',
    rationale: [],
    consequences: [],
    alternatives: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case '--title':
        parsed.title = value;
        i++;
        break;
      case '--context':
        parsed.context = value;
        i++;
        break;
      case '--decision':
        parsed.decision = value;
        i++;
        break;
      case '--rationale':
        parsed.rationale.push(value);
        i++;
        break;
      case '--consequences':
        parsed.consequences.push(value);
        i++;
        break;
      case '--alternatives':
        parsed.alternatives.push(value);
        i++;
        break;
    }
  }

  return parsed;
}

// Find the next ADR number
function getNextAdrNumber() {
  if (!fs.existsSync(ADR_DIR)) {
    return 1;
  }

  const files = fs.readdirSync(ADR_DIR);
  const adrFiles = files.filter(f => f.match(/^ADR-(\d+)-/));

  if (adrFiles.length === 0) {
    return 1;
  }

  const numbers = adrFiles.map(f => {
    const match = f.match(/^ADR-(\d+)-/);
    return match ? parseInt(match[1], 10) : 0;
  });

  return Math.max(...numbers) + 1;
}

// Generate slug from title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Generate ADR content
function generateAdrContent(number, data) {
  const date = new Date().toISOString().split('T')[0];

  let content = `# ADR-${String(number).padStart(3, '0')}: ${data.title}\n`;
  content += `Date: ${date}\n`;
  content += `Status: Active\n\n`;

  content += `## Context\n${data.context}\n\n`;
  content += `## Decision\n${data.decision}\n\n`;

  if (data.rationale.length > 0) {
    content += `## Rationale\n`;
    data.rationale.forEach(r => {
      content += `- ${r}\n`;
    });
    content += `\n`;
  }

  if (data.consequences.length > 0) {
    content += `## Consequences\n`;
    data.consequences.forEach(c => {
      content += `- ${c}\n`;
    });
    content += `\n`;
  }

  if (data.alternatives.length > 0) {
    content += `## Alternatives Considered\n`;
    data.alternatives.forEach(a => {
      content += `- ${a}\n`;
    });
    content += `\n`;
  }

  content += `---\nSuperseded by: (none)\n`;

  return content;
}

// Main
function main() {
  const data = parseArgs();

  if (!data.title || !data.context || !data.decision) {
    console.error('Error: --title, --context, and --decision are required');
    process.exit(1);
  }

  const number = getNextAdrNumber();
  const slug = slugify(data.title);
  const filename = `ADR-${String(number).padStart(3, '0')}-${slug}.md`;
  const filepath = path.join(ADR_DIR, filename);

  const content = generateAdrContent(number, data);

  fs.writeFileSync(filepath, content);

  console.log(`✅ Created: ${filename}`);
  console.log(`   Path: ${filepath}`);
}

main();
