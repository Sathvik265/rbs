const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

router.post("/print", (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "No print text provided" });
  }

  // Define a temporary file path to store the ASCII receipt
  const tempFilePath = path.join(__dirname, "..", "..", "temp_receipt.txt");

  try {
    // Write the receipt string to the temporary file
    fs.writeFileSync(tempFilePath, text, "utf8");

    // macOS / Linux / non-Windows development bypass
    if (process.platform !== "win32") {
      console.log("\n=================== MOCK PRINT JOB (macOS/Linux) ===================");
      console.log(text);
      console.log("===================================================================\n");

      // Clean up the temporary file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (e) {}

      return res.json({ message: "Mock print successful (Non-Windows environment logs print text)" });
    }

    // Windows RAW byte bypass method (avoids graphical spooler padding + unicode bugs)
    // Relies on the printer being shared on the network/localhost.
    const printerShareName = process.env.PRINTER_NAME || "Generic  Text Only";
    
    // /b flag forces a raw binary copy straight to the port, preventing *any* Windows driver modifications
    const cmdCommand = `copy /b "${tempFilePath}" "\\\\localhost\\${printerShareName}"`;

    // Execute the raw copy
    exec(cmdCommand, (error, stdout, stderr) => {
      // Clean up the temporary file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupErr) {
        console.error("Failed to delete temp receipt file", cleanupErr);
      }

      if (error) {
        console.warn("Direct print failed (No physical printer connected or shared):", error.message);
        // Soft fallback: return 200 with warning so frontend flow does not halt
        return res.json({ 
          message: "Processed bill, but printer connection failed.", 
          warning: "Printer not found. Is it turned on and shared on network?" 
        });
      }

      res.json({ message: "Print job sent successfully" });
    });
  } catch (err) {
    console.error("File generation failed:", err);
    return res.status(500).json({ error: "Failed to create temporary print file" });
  }
});

module.exports = router;
