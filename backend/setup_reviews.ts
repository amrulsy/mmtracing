import db from "./src/config/db";

async function run() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customer_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        spkId INT NOT NULL,
        pelangganId INT NOT NULL,
        rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        tags JSON,
        isPublic BOOLEAN DEFAULT true,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_spk_review (spkId),
        FOREIGN KEY (spkId) REFERENCES spk(id) ON DELETE CASCADE,
        FOREIGN KEY (pelangganId) REFERENCES pelanggan(id) ON DELETE CASCADE
      )
    `);
    console.log("Success creating customer_reviews table.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
