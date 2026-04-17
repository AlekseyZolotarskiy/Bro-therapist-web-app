import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  
  app.use(express.json());

  // GA4 Measurement Protocol (S2S) Route
  app.post("/api/track-promise", async (req, res) => {
    const { userId, amount, title } = req.body;
    const measurementId = process.env.GA4_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_API_SECRET;

    if (!measurementId || !apiSecret) {
      console.warn("GA4 S2S: Missing measurementId or apiSecret. Skipping tracking.");
      return res.status(200).json({ status: "skipped", reason: "missing_config" });
    }

    try {
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
      
      const payload = {
        client_id: userId || 'anonymous_bro', // S2S requires a client_id
        events: [{
          name: 'promise_created_s2s',
          params: {
            amount: amount,
            goal_title: title,
            engagement_time_msec: 1
          }
        }]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log(`GA4 S2S Tracked: ${title} with $${amount}. Status: ${response.status}`);
      res.json({ status: "ok" });
    } catch (error) {
      console.error("GA4 S2S Error:", error);
      res.status(500).json({ status: "error" });
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
