const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/(admin)/app/spk/create/page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// Remove DRAFT_KEY references that were left over
content = content.replace(/      try \{ localStorage\.removeItem\(DRAFT_KEY\); \} catch \{ \/\* ignore \*\/ \}/g, '');

// Remove the lingering useEffects that mention pelangganList and kendaraanList
// Because I removed the state, the useEffects are causing errors.
// Looking at the lines 215 and 229, they are likely useEffects trying to set pelangganSearch and kendaraanSearch.
const useEffectRegex = /\s*\/\/ Load selected initial values[\s\S]*?\}, \[kendaraanList, kendaraanId\]\);\n/g;
if (content.match(useEffectRegex)) {
  content = content.replace(useEffectRegex, '');
} else {
  // Try manually removing blocks containing pelangganList
  content = content.replace(/\s*\w+\(\(\) => \{[\s\S]*?pelangganList\.find[\s\S]*?\}\);\n/g, '');
  content = content.replace(/\s*if \(kendaraanList\.length > 0[\s\S]*?\}, \[kendaraanList, kendaraanId\]\);\n/g, '');
}

// Remove modals
content = content.replace(/\s*\{showAddPelanggan && \([\s\S]*?\}\)\}/g, '');
content = content.replace(/\s*\{showAddKendaraan && \([\s\S]*?\}\)\}/g, '');

fs.writeFileSync(pagePath, content);
console.log("Refactoring part 2 complete.");
