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

    // Windows RAW byte bypass method (avoids graphical spooler padding + unicode bugs)
    // Relies on the printer being shared on the network/localhost.
    // The default name "Generic  Text Only" matches your current Windows share name perfectly.
    const printerShareName = process.env.PRINTER_NAME || "Generic  Text Only";
    
    // /b flag forces a raw binary copy straight to the port, preventing *any* Windows driver modifications
    const cmdCommand = `copy /b "${tempFilePath}" "\\\\localhost\\${printerShareName}"`;

    // Execute the raw copy (Node's exec natively uses cmd.exe on Windows)
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
        console.error("Direct print failed:", error);
        return res.status(500).json({ error: "Failed to send print job to Windows Spooler" });
      }

      res.json({ message: "Print job sent successfully" });
    });
  } catch (err) {
    console.error("File generation failed:", err);
    return res.status(500).json({ error: "Failed to create temporary print file" });
  }
});

module.exports = router;
