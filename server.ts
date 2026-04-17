import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load firebase config to get measurementId automatically for S2S
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    const altPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(altPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(altPath, 'utf8'));
    }
  }
} catch (e) {
  console.error("Failed to load firebase config for S2S:", e);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  
  app.use(express.json());

  // GA4 Measurement Protocol (S2S) Route
  app.post("/api/track-promise", async (req, res) => {
    const { userId, amount, title, forceSecret } = req.body;
    
    // 1. Try to find the secret in: 
    // - request body (for first-time setup or debug)
    // - env vars
    // - (future: firestore, but we'll start with body/env)
    const measurementId = process.env.GA4_MEASUREMENT_ID || process.env.VITE_GA4_MEASUREMENT_ID || firebaseConfig.measurementId;
    const apiSecret = forceSecret || process.env.GA4_API_SECRET || process.env.VITE_GA4_API_SECRET;

    if (!measurementId || !apiSecret) {
      return res.status(200).json({ 
        status: "skipped", 
        reason: "missing_config",
        details: { hasId: !!measurementId, hasSecret: !!apiSecret } 
      });
    }

    console.log("--- GA4 S2S Incoming Request ---");
    console.log(`User: ${userId}, Amount: ${amount}, Title: ${title}`);
    console.log(`Using Measurement ID: ${measurementId}`);

    if (!measurementId || !apiSecret) {
      console.error("GA4 S2S ERROR: Missing config (ID or Secret).");
      return res.status(200).json({ 
        status: "skipped", 
        reason: "missing_config",
        details: { hasId: !!measurementId, hasSecret: !!apiSecret } 
      });
    }

    try {
      // Step 1: Validate payload using GA4 debug endpoint
      const debugUrl = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
      const payload = {
        client_id: userId || 'anonymous_bro',
        events: [{
          name: 'promise_created_s2s',
          params: {
            amount: Number(amount),
            goal_title: title,
            debug_mode: true // This helps show up in DebugView
          }
        }]
      };

      const debugResponse = await fetch(debugUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const debugResult = await debugResponse.json();
      
      console.log(`GA4 S2S Validation Result:`, JSON.stringify(debugResult));

      // Step 2: If valid or even if we just want to try the real one
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log(`GA4 S2S Real Call Status: ${response.status}`);
      res.json({ 
        status: "ok", 
        debug: debugResult,
        ga_status: response.status 
      });
    } catch (error) {
      console.error("GA4 S2S CRITICAL ERROR:", error);
      res.status(500).json({ status: "error", message: String(error) });
    }
  });

  // More robust production check
  const isProd = process.env.NODE_ENV === "production" || 
                 process.env.VITE_USER_NODE_ENV === "production" ||
                 fs.existsSync(path.join(process.cwd(), 'dist'));

  console.log(`--- Server Diagnostic ---`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`CWD: ${process.cwd()}`);
  console.log(`Mode: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);

  if (!isProd) {
    console.log("Starting in DEVELOPMENT mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode...");
    // Try multiple possible paths for dist
    const possiblePaths = [
      path.join(process.cwd(), 'dist'),
      path.resolve(__dirname, 'dist'),
    ];
    
    let distPath = possiblePaths[0];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        distPath = p;
        break;
      }
    }

    console.log(`Resolved dist path: ${distPath}`);
    if (!fs.existsSync(distPath)) {
      console.error(`CRITICAL: dist directory NOT FOUND at ${distPath}`);
    }

    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`404: index.html not found at ${indexPath}`);
        res.status(404).send("Application files not found. Please check build logs.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is live on port ${PORT}`);
    console.log(`-------------------------`);
  });
}

startServer();
