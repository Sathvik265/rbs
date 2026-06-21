const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const fsSyncCheck = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { randomUUID } = require("crypto");
const os = require("os");

// Cache configuration at startup to avoid repeated lookups
const PRINTER_NAME = process.env.PRINTER_NAME || "Generic  Text Only";
const MAX_PRINT_SIZE = 10 * 1024 * 1024; // 10MB limit
const EXEC_TIMEOUT = 25000; // 25 second timeout
const TEMP_DIR = os.tmpdir();
const IS_WINDOWS = process.platform === "win32";

router.post("/print", async (req, res) => {
  const { text } = req.body;

  // Input validation
  if (!text) {
    return res.status(400).json({ error: "No print text provided" });
  }

  if (typeof text !== "string" || text.length > MAX_PRINT_SIZE) {
    return res.status(413).json({ error: "Print content exceeds maximum size limit" });
  }

  // Use unique temp file per request to prevent race conditions
  const tempFilePath = path.join(TEMP_DIR, `receipt_${randomUUID()}.txt`);

  try {
    // Handle non-Windows development environment
    if (!IS_WINDOWS) {
      console.log("\n=================== MOCK PRINT JOB (macOS/Linux) ===================");
      console.log(text);
      console.log("===================================================================\n");
      return res.json({ message: "Mock print successful (Non-Windows environment logs print text)" });
    }

    // Write the receipt asynchronously (non-blocking)
    await fs.writeFile(tempFilePath, text, "utf8");

    // Execute the raw copy with timeout protection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Print job execution timeout"));
      }, 30000);

      // Use execFile (more secure and performant than exec)
      execFile(
        "cmd.exe",
        ["/c", `copy /b "${tempFilePath}" "\\\\localhost\\${PRINTER_NAME}"`],
        { timeout: EXEC_TIMEOUT },
        (error) => {
          clearTimeout(timeout);
          if (error) reject(error);
          else resolve();
        }
      );
    });

    res.json({ message: "Print job sent successfully" });
  } catch (err) {
    console.warn("Print operation failed:", err.message);
    // Soft fallback: return 200 with warning so frontend flow does not halt
    res.json({ 
      message: "Processed bill, but printer connection failed.", 
      warning: "Printer not found. Is it turned on and shared on network?" 
    });
  } finally {
    // Guarantee cleanup in all scenarios
    try {
      if (fsSyncCheck.existsSync(tempFilePath)) {
        await fs.unlink(tempFilePath);
      }
    } catch (cleanupErr) {
      console.error("Failed to cleanup temp file:", cleanupErr);
    }
  }
});

module.exports = router;
