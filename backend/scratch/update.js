const fs = require('fs');
const path = require('path');

const replacements = [
  {
    file: 'jadwal.routes.ts',
    replaces: [
      { find: "requireRole('Admin', 'Mekanik')", replace: "requirePermission('monitoring', 'edit')" },
      { find: "requireRole('Admin')", replace: "requirePermission('monitoring', 'full')" }
    ]
  },
  {
    file: 'spk.routes.ts',
    replaces: [
      { find: "requireRole('Admin')", replace: "requirePermission('spk', 'full')" }
    ]
  },
  {
    file: 'pelanggan.routes.ts',
    replaces: [
      { find: "requireRole('Admin')", replace: "requirePermission('master', 'full')" }
    ]
  },
  {
    file: 'kendaraan.routes.ts',
    replaces: [
      { find: "requireRole('Admin')", replace: "requirePermission('master', 'full')" }
    ]
  },
  {
    file: 'mekanik.routes.ts',
    replaces: [
      { find: "requireRole('Admin')", replace: "requirePermission('master', 'full')" }
    ]
  },
  {
    file: 'jasa.routes.ts',
    replaces: [
      { find: "requireRole('Admin')", replace: "requirePermission('master', 'full')" }
    ]
  },
  {
    file: 'sparepart.routes.ts',
    replaces: [
      { find: "requireRole('Admin')", replace: "requirePermission('master', 'full')" }
    ]
  },
  {
    file: 'pengeluaran.routes.ts',
    replaces: [
      { find: "requireRole('Admin')", replace: "requirePermission('pembayaran', 'full')" }
    ]
  },
  {
    file: 'inventaris.routes.ts',
    replaces: [
      { find: "requireRole('Admin')", replace: "requirePermission('monitoring', 'full')" }
    ]
  },
  {
    file: 'garansi.routes.ts',
    replaces: [
      { find: "requireRole('Admin')", replace: "requirePermission('monitoring', 'full')" }
    ]
  }
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('c:/dev/mmtracing/backend/src/modules');

files.forEach(f => {
  const basename = path.basename(f);
  const rule = replacements.find(r => r.file === basename);
  if (rule) {
    let content = fs.readFileSync(f, 'utf8');
    let changed = false;
    
    // Auto import requirePermission if not imported
    if (!content.includes('requirePermission')) {
      content = content.replace(/requireRole/, 'requireRole, requirePermission');
      changed = true;
    }
    
    rule.replaces.forEach(r => {
      if (content.includes(r.find)) {
        content = content.split(r.find).join(r.replace);
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(f, content);
      console.log('Updated ' + f);
    }
  }
});
