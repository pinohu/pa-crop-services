#!/usr/bin/env node
// PA CROP Services — Content Validation CI
// Scans all public HTML and API JS files for compliance claims
// and validates them against data/compliance-rules.json.
//
// Run: node scripts/validate-content.js
// Exit code: 0 = pass, 1 = violations found
//
// What it catches:
// - Wrong deadlines (e.g., "September 30" used for corporations)
// - Wrong dissolution dates (e.g., "December 31, 2027" as universal cutoff)
// - Wrong fees
// - Missing entity-type qualifiers on deadline claims

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const RULES = JSON.parse(readFileSync(new URL('../data/compliance-rules.json', import.meta.url), 'utf8'));

const violations = [];
let filesScanned = 0;

// ── Files to scan ──
function collectFiles(dir, extensions) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full, extensions));
    } else if (extensions.includes(extname(full))) {
      results.push(full);
    }
  }
  return results;
}

// On Windows, import.meta.url gives file:///C:/... which pathname turns into /C:/...
// Use fileURLToPath for cross-platform correctness
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const htmlFiles = collectFiles(join(rootDir, 'public'), ['.html', '.js']);
const apiFiles = collectFiles(join(rootDir, 'api'), ['.js']);
const allFiles = [...htmlFiles, ...apiFiles];

// ── Violation patterns ──

function addViolation(file, line, rule, detail) {
  violations.push({ file: file.replace(rootDir, ''), line, rule, detail });
}

// Pattern 1: Unqualified "September 30" deadline (not preceded by "LLC")
// Allowed: "LLCs by September 30", "LLC deadline is September 30"
// Forbidden: "annual report due September 30" (implies all entities)
const SEPT_30_PATTERN = /(?:annual report|report|deadline|due|filing).{0,30}(?:September 30|Sept\.? 30|09[\-\/]30)/gi;
const LLC_QUALIFIER = /LLC|limited liability company|entity.type/i;

// Pattern 2: Universal "December 31, 2027" cutoff
const DEC_2027_PATTERN = /(?:by|before|until)\s+(?:December 31|Dec\.?\s*31),?\s*2027/gi;

// Pattern 3: Wrong fee amounts
const FEE_PATTERN = /(?:fee|cost|price)\s+(?:is|of|:)\s+\$(\d+)/gi;

// Pattern 4: "all entities" + single deadline (should have entity-type breakdown)
const ALL_ENTITIES_SINGLE = /(?:all|every)\s+(?:PA\s+)?(?:entities|businesses|entity)\s+(?:must|need to|should)\s+file.{0,50}(?:September 30|June 30|December 31)/gi;

// Pattern 5: Wildcard CORS (security)
const WILDCARD_CORS = /Access-Control-Allow-Origin['":\s]+\*/g;

// Pattern 6: Silent catch swallowing errors
const SILENT_CATCH = /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g;

// Pattern 7: Raw console.log in API code (should use structured logger)
const RAW_CONSOLE_LOG = /\bconsole\.log\(/g;

// Pattern 8: Wrong reinstatement fee — canonical is $35 online / $40 paper.
// Catches phrasings like "$70 reinstatement", "reinstatement ... $70", "$70 plus delinquent".
// Allows legitimate math totals like "$70 by paper" (which reflects $40 + 2×$15) by requiring
// proximity to the word "reinstatement" or "plus delinquent". Bare "$70" is not flagged so
// unrelated $70 fees (e.g., DSCB:15-108 change-of-registered-office) don't false-positive.
const WRONG_REINSTATEMENT_FEE = /(?:\$70\s+reinstatement|reinstatement[^.<]{0,80}\$70\b|\$70\s+(?:plus|\+)\s+delinquent)/gi;

// Pattern 9: Wrong delinquent annual report fee — canonical is $15 (late-filing fee
// under 15 Pa.C.S. § 146). On-time annual report fee is $7, so we only flag the
// "delinquent / each" contexts. We deliberately do NOT match a generic "late ... $7"
// because correct text often says "no late-filing penalty — the standard $7 still applies".
const WRONG_DELINQUENT_FEE = /\$7\s+each|\$7\s+per\s+delinquent|delinquent[^.<]{0,80}\$7\b/gi;

// ── Scan each file ──

for (const filePath of allFiles) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  filesScanned++;

  // Skip the rules file itself, the validation script, and the architecture doc
  if (filePath.includes('compliance-rules.json') || filePath.includes('validate-content') || filePath.includes('ARCHITECTURE') || filePath.includes('AUDIT-REMEDIATION') || filePath.includes('INFRASTRUCTURE')) continue;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Pattern 1: Unqualified September 30
    const septMatches = line.match(SEPT_30_PATTERN);
    if (septMatches) {
      // Check if the surrounding context qualifies it with "LLC"
      const surroundingStart = Math.max(0, line.indexOf(septMatches[0]) - 80);
      const surroundingEnd = Math.min(line.length, line.indexOf(septMatches[0]) + septMatches[0].length + 30);
      const surrounding = line.substring(surroundingStart, surroundingEnd);
      if (!LLC_QUALIFIER.test(surrounding)) {
        addViolation(filePath, lineNum, 'UNQUALIFIED_SEPT_30',
          `"September 30" used without LLC qualifier. Context: "${septMatches[0].substring(0, 60)}"`);
      }
    }

    // Pattern 2: Universal Dec 31, 2027 cutoff
    const dec2027Matches = line.match(DEC_2027_PATTERN);
    if (dec2027Matches) {
      addViolation(filePath, lineNum, 'UNIVERSAL_2027_CUTOFF',
        `"December 31, 2027" presented as universal cutoff. Should be "six months after entity-type due date". Context: "${dec2027Matches[0]}"`);
    }

    // Pattern 4: All entities + single deadline
    const allEntMatches = line.match(ALL_ENTITIES_SINGLE);
    if (allEntMatches) {
      addViolation(filePath, lineNum, 'ALL_ENTITIES_SINGLE_DEADLINE',
        `"All entities" paired with single deadline. Should break down by entity type. Context: "${allEntMatches[0].substring(0, 80)}"`);
    }

    // Pattern 8: Wrong reinstatement fee
    const wrongReinstateMatches = line.match(WRONG_REINSTATEMENT_FEE);
    if (wrongReinstateMatches) {
      addViolation(filePath, lineNum, 'WRONG_REINSTATEMENT_FEE',
        `Reinstatement fee should be $35 online ($40 paper) per data/compliance-rules.json. Context: "${wrongReinstateMatches[0].substring(0, 80)}"`);
    }

    // Pattern 9: Wrong delinquent annual report fee
    const wrongDelinquentMatches = line.match(WRONG_DELINQUENT_FEE);
    if (wrongDelinquentMatches) {
      addViolation(filePath, lineNum, 'WRONG_DELINQUENT_FEE',
        `Delinquent annual report late-filing fee should be $15 each per data/compliance-rules.json. Context: "${wrongDelinquentMatches[0].substring(0, 80)}"`);
    }

    // Only check API JS files for code quality patterns
    if (filePath.includes('/api/') || filePath.includes('\\api\\')) {
      // Skip _log.js itself for console.log check
      if (!filePath.includes('_log.js') && !filePath.includes('validate-content')) {
        // Pattern 5: Wildcard CORS
        if (WILDCARD_CORS.test(line)) {
          WILDCARD_CORS.lastIndex = 0;
          addViolation(filePath, lineNum, 'WILDCARD_CORS',
            `Wildcard CORS detected. Must restrict to pacropservices.com origins.`);
        }

        // Pattern 6: Silent catch
        if (SILENT_CATCH.test(line)) {
          SILENT_CATCH.lastIndex = 0;
          addViolation(filePath, lineNum, 'SILENT_CATCH',
            `Silent .catch(() => {}) swallows errors. Use structured logging.`);
        }

        // Pattern 7: Raw console.log (not in logger)
        if (RAW_CONSOLE_LOG.test(line)) {
          RAW_CONSOLE_LOG.lastIndex = 0;
          addViolation(filePath, lineNum, 'RAW_CONSOLE_LOG',
            `Raw console.log() in API code. Use structured logger from _log.js instead.`);
        }
      }
    }
  });
}

// ── Report ──

console.log(`\n  PA CROP Content Validation`);
console.log(`  Scanned ${filesScanned} files against compliance-rules.json v${RULES.version}\n`);

if (violations.length === 0) {
  console.log(`  ✅ No violations found.\n`);
  process.exit(0);
} else {
  console.log(`  ❌ ${violations.length} violation(s) found:\n`);
  violations.forEach((v, i) => {
    console.log(`  ${i + 1}. [${v.rule}] ${v.file}:${v.line}`);
    console.log(`     ${v.detail}\n`);
  });
  process.exit(1);
}
