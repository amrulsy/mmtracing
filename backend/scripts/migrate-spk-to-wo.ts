/**
 * Migration: Rename SPK → Work Order (WO)
 * 
 * This script renames:
 * 1. Tables: spk → work_orders, spk_items → wo_items, spk_stages → wo_stages, spk_photos → wo_photos
 * 2. Columns: noSpk → noWo, spkId → woId (in all related tables)
 * 3. Data: SPK- prefix → WO- prefix in noWo values
 * 4. WhatsApp template variable: {no_spk} → {no_wo}
 * 5. Permission key: 'spk' → 'wo' in roles table
 * 
 * Usage: npx tsx scripts/migrate-spk-to-wo.ts
 */

import 'dotenv/config';
import db from '../src/config/db';

async function migrate() {
  console.log('🚀 Starting SPK → WO migration...\n');

  try {
    // ══════════════════════════════════════════════
    // Step 1: Rename columns BEFORE renaming tables
    // ══════════════════════════════════════════════
    console.log('📝 Step 1: Renaming columns...');

    // Rename noSpk → noWo in spk table
    await safeExec("ALTER TABLE spk CHANGE COLUMN noSpk noWo VARCHAR(30) NOT NULL", 'spk.noSpk → noWo');

    // Rename spkId → woId in child tables
    await safeExec("ALTER TABLE spk_items CHANGE COLUMN spkId woId INT NOT NULL", 'spk_items.spkId → woId');
    await safeExec("ALTER TABLE spk_stages CHANGE COLUMN spkId woId INT NOT NULL", 'spk_stages.spkId → woId');
    await safeExec("ALTER TABLE spk_photos CHANGE COLUMN spkId woId INT NOT NULL", 'spk_photos.spkId → woId');
    await safeExec("ALTER TABLE garansi CHANGE COLUMN spkId woId INT NOT NULL", 'garansi.spkId → woId');
    await safeExec("ALTER TABLE pembayaran CHANGE COLUMN spkId woId INT NOT NULL", 'pembayaran.spkId → woId');
    
    // approval_tokens
    await safeExec("ALTER TABLE approval_tokens CHANGE COLUMN spkId woId INT NOT NULL", 'approval_tokens.spkId → woId');
    
    // bookings (may have spkId as nullable)
    await safeExec("ALTER TABLE bookings CHANGE COLUMN spkId woId INT DEFAULT NULL", 'bookings.spkId → woId');
    await safeExec("ALTER TABLE jadwal RENAME COLUMN spkId TO woId", 'jadwal.spkId → woId');
    await safeExec("ALTER TABLE customer_reviews RENAME COLUMN spkId TO woId", 'customer_reviews.spkId → woId');

    console.log('');

    // ══════════════════════════════════════════════
    // Step 2: Rename tables
    // ══════════════════════════════════════════════
    console.log('📝 Step 2: Renaming tables...');

    await safeExec("RENAME TABLE spk TO work_orders", 'spk → work_orders');
    await safeExec("RENAME TABLE spk_items TO wo_items", 'spk_items → wo_items');
    await safeExec("RENAME TABLE spk_stages TO wo_stages", 'spk_stages → wo_stages');
    await safeExec("RENAME TABLE spk_photos TO wo_photos", 'spk_photos → wo_photos');

    console.log('');

    // ══════════════════════════════════════════════
    // Step 3: Update data — SPK- prefix → WO- prefix
    // ══════════════════════════════════════════════
    console.log('📝 Step 3: Updating noWo prefix SPK- → WO-...');

    const result = await db.execute(
      "UPDATE work_orders SET noWo = CONCAT('WO-', SUBSTRING(noWo, 5)) WHERE noWo LIKE 'SPK-%'"
    );
    console.log(`   ✅ Updated ${result.affectedRows} rows`);

    console.log('');

    // ══════════════════════════════════════════════
    // Step 4: Update WhatsApp templates in settings
    // ══════════════════════════════════════════════
    console.log('📝 Step 4: Updating WhatsApp template variables...');

    // Update {no_spk} → {no_wo} in template text
    const templateSetting = await db.queryOne<{ value: string }>(
      "SELECT value FROM settings WHERE `key` = 'templates'"
    );

    if (templateSetting) {
      let templates = templateSetting.value;
      templates = templates.replace(/\{no_spk\}/g, '{no_wo}');
      templates = templates.replace(/SPK Dibuat/g, 'Work Order Dibuat');
      templates = templates.replace(/SPK Kendala/g, 'Work Order Kendala');
      templates = templates.replace(/SPK Dibatalkan/g, 'Work Order Dibatalkan');
      await db.execute("UPDATE settings SET value = ? WHERE `key` = 'templates'", [templates]);
      console.log('   ✅ Templates updated');
    } else {
      console.log('   ⚠️  No templates found in settings');
    }

    console.log('');

    // ══════════════════════════════════════════════
    // Step 5: Update permission key in roles
    // ══════════════════════════════════════════════
    console.log('📝 Step 5: Updating permission keys in roles...');

    const roles = await db.query<{ id: number; permissions: string }>(
      "SELECT id, permissions FROM roles WHERE permissions IS NOT NULL"
    );

    for (const role of roles) {
      try {
        const perms = JSON.parse(role.permissions);
        if (perms && typeof perms === 'object' && 'spk' in perms) {
          perms['wo'] = perms['spk'];
          delete perms['spk'];
          await db.execute(
            "UPDATE roles SET permissions = ? WHERE id = ?",
            [JSON.stringify(perms), role.id]
          );
          console.log(`   ✅ Role #${role.id}: 'spk' → 'wo'`);
        }
      } catch {
        // Skip if not valid JSON
      }
    }

    // Also update activity_logs module references
    await safeExec(
      "UPDATE activity_logs SET module = 'wo' WHERE module = 'spk'",
      'activity_logs.module spk → wo'
    );

    console.log('\n✅ Migration completed successfully!\n');

  } catch (err: any) {
    console.error('\n❌ Migration FAILED:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }

  process.exit(0);
}

async function safeExec(sql: string, label: string) {
  try {
    await db.execute(sql);
    console.log(`   ✅ ${label}`);
  } catch (err: any) {
    if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_DUP_FIELDNAME' || 
        err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_NO_SUCH_TABLE' ||
        err.message?.includes('already exists') || err.message?.includes('Unknown column')) {
      console.log(`   ⚠️  ${label} — skipped (already done or not applicable)`);
    } else {
      throw err;
    }
  }
}

migrate();
