const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/(admin)/app/spk/create/page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Add imports
if (!content.includes('CustomerVehicleForm')) {
  content = content.replace(
    'import { ServiceBundlePicker } from "./ServiceBundles";',
    'import { ServiceBundlePicker } from "./ServiceBundles";\nimport { CustomerVehicleForm } from "./CustomerVehicleForm";\nimport { useDraftStorage } from "./hooks/useDraftStorage";'
  );
}

// 2. Remove states that are handled by CustomerVehicleForm 
// Keep: pelangganId, kendaraanId, odometerMasuk, pelangganSearch, kendaraanSearch
// Remove: pelangganList, kendaraanList, showAddPelanggan, newPelangganName, etc.
content = content.replace(/const \[pelangganList, setPelangganList\] = useState<Pelanggan\[\]>\(\[\]\);\n/g, '');
content = content.replace(/const \[kendaraanList, setKendaraanList\] = useState<Kendaraan\[\]>\(\[\]\);\n/g, '');

content = content.replace(/  \/\/ Modals & Combobox[\s\S]*?const \[addingKendaraan, setAddingKendaraan\] = useState\(false\);\n/g, '');
content = content.replace(/const \[showPelDropdown, setShowPelDropdown\] = useState\(false\);\n/g, '');
content = content.replace(/const \[showKenDropdown, setShowKenDropdown\] = useState\(false\);\n/g, '');


// 3. Replace the Draft block with useDraftStorage
const draftRegex = /  \/\/ Autosave draft ke localStorage per mode[\s\S]*?setDraftAvailable\(null\);\n  };\n/g;
const useDraftString = `  const { draftAvailable, restoreDraft, dismissDraft } = useDraftStorage(
    mode,
    { pelangganId, kendaraanId, odometerMasuk, mekanikId, prioritas, keluhan, judulProyek, spesifikasi, stages, bubutKeluhan, namaBubut, selectedJasaItems, selectedSparepartItems },
    { setPelangganId, setKendaraanId, setOdometerMasuk, setMekanikId, setPrioritas, setKeluhan, setJudulProyek, setSpesifikasi, setStages, setBubutKeluhan, setNamaBubut, setSelectedJasaItems, setSelectedSparepartItems },
    searchParams
  );\n`;

if (content.match(draftRegex)) {
  content = content.replace(draftRegex, useDraftString);
}

// 4. Remove useEffects for API fetching Pelanggan and Kendaraan
const useEffectPelangganRegex = /  \/\/ Load pelanggan dari API saat search berubah[\s\S]*?\}, \[pelangganSearch\]\);\n/g;
content = content.replace(useEffectPelangganRegex, '');

// 5. Remove handleAddPelanggan and handleAddKendaraan and filteredPelanggan/filteredKendaraan
const handleAddRegex = /  \/\/ ── Quick Create API Handlers ──[\s\S]*?const filteredKendaraan = kendaraanList\.filter[\s\S]*?\);\n/g;
content = content.replace(handleAddRegex, '');

// 6. Replace the JSX for Pelanggan and Kendaraan
// It starts after `{/* Form Pelanggan & Kendaraan */}` or something similar. Let's find it.
// The block has `<div className="space-y-1.5 relative">` for Pelanggan.
// Actually, it's safer to just let the script output the file and I'll do the JSX replacement via replace_file_content if I can find the exact lines.

fs.writeFileSync(pagePath, content);
console.log("Refactoring part 1 complete.");
