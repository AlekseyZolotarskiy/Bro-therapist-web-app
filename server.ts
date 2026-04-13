import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import * as GenerativeAI from "@google/generative-ai";

// Handle potential ESM/CJS interop issues
const GoogleGenerativeAI = (GenerativeAI as any).GoogleGenerativeAI || (GenerativeAI as any).default?.GoogleGenerativeAI || GenerativeAI.GoogleGenerativeAI;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  
  app.use(express.json());

  // Initialize Gemini on server
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

  if (genAI) {
    console.log("Gemini SDK initialized successfully");
    // Basic check for the method
    if (typeof genAI.getGenerativeModel !== 'function') {
      console.error("CRITICAL: genAI.getGenerativeModel is NOT a function! Check SDK version.");
    }
  } else {
    console.warn("Gemini API key is missing - AI features will be disabled");
  }

  // API Proxy for Gemini
  app.post("/api/chat", async (req, res) => {
    if (!genAI) return res.status(500).json({ error: "Gemini API key not configured on server" });
    
    console.log("Chat request received. genAI type:", typeof genAI);
    if (genAI && typeof genAI.getGenerativeModel !== 'function') {
      console.error("genAI keys:", Object.keys(genAI));
      return res.status(500).json({ error: "Gemini SDK error: getGenerativeModel is not a function. Please check server logs." });
    }

    try {
      const { history, systemInstruction } = req.body;
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest"
      });
      const result = await model.generateContent({ 
        contents: history,
        systemInstruction: systemInstruction 
      } as any);
      res.json({ text: result.response.text() });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/goals/report", async (req, res) => {
    if (!genAI) return res.status(500).json({ error: "Gemini API key not configured on server" });
    try {
      const { prompt, systemInstruction } = req.body;
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest"
      });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction
      } as any);
      res.json({ text: result.response.text() });
    } catch (error: any) {
      console.error("Gemini Report Error:", error);
      res.status(500).json({ error: error.message });
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
