const pool = require("../db");

const SettingsModel = {
  // Get settings for a specific clerk
  async getSettings(clerk_initials) {
    const code = clerk_initials ? clerk_initials.toUpperCase() : "CLK";
    const result = await pool.query(
      "SELECT * FROM settings WHERE clerk_initials = $1",
      [code],
    );

    if (result.rows.length === 0) {
      // If not found, try to ensure it exists (auto-provision)
      return await this.ensureSettings(code);
    }

    return result.rows[0];
  },

  // Update settings for a specific clerk
  async updateSettings(clerk_initials, data) {
    const code = clerk_initials ? clerk_initials.toUpperCase() : "CLK";
    const { hotel_name, address, phone, gstin } = data;

    // Check if exists
    const check = await pool.query(
      "SELECT id FROM settings WHERE clerk_initials = $1",
      [code],
    );

    if (check.rows.length === 0) {
      // Create if checks fail (though ensureSettings should prevent this)
      await this.ensureSettings(code);
    }

    const result = await pool.query(
      `UPDATE settings 
         SET hotel_name = $1, address = $2, phone = $3, gstin = $4 
         WHERE clerk_initials = $5 
         RETURNING *`,
      [hotel_name, address, phone, gstin, code],
    );
    return result.rows[0];
  },

  // Ensure settings exist for a clerk (auto-provisioning)
  async ensureSettings(clerk_initials) {
    const code = clerk_initials ? clerk_initials.toUpperCase() : "CLK";
    console.log(`ensureSettings called for clerk: "${code}"`);

    // 1. Check if exists
    const check = await pool.query(
      "SELECT * FROM settings WHERE clerk_initials = $1",
      [code],
    );

    if (check.rows.length > 0) {
      console.log(`Clerk "${code}" already exists in settings`);
      return check.rows[0];
    }

    console.log(`Clerk "${code}" not found, creating new entry...`);

    // 2. If not, fetch 'CLK' template (or hardcoded defaults)
    let defaults = {
      hotel_name: "Default Hotel",
      address: "Address",
      phone: "0000000000",
      gstin: "",
    };

    const template = await pool.query(
      "SELECT * FROM settings WHERE clerk_initials = 'CLK'",
    );

    if (template.rows.length > 0) {
      defaults = { ...template.rows[0] };
      console.log(`Using CLK template for new clerk "${code}"`);
    }

    // 3. Insert new row for this clerk
    const result = await pool.query(
      `INSERT INTO settings (hotel_name, address, phone, gstin, clerk_initials, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (clerk_initials) DO UPDATE SET hotel_name = EXCLUDED.hotel_name 
       RETURNING *`,
      [
        defaults.hotel_name,
        defaults.address,
        defaults.phone,
        defaults.gstin,
        code,
      ],
    );

    console.log(`Clerk "${code}" created successfully:`, result.rows[0]);
    return result.rows[0];
  },

  // Admin feature: List all clerks with settings
  async getAllClerks() {
    const res = await pool.query(
      "SELECT clerk_initials, hotel_name FROM settings ORDER BY clerk_initials",
    );
    return res.rows;
  },
};

module.exports = SettingsModel;
