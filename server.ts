import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as googleTTS from 'google-tts-api';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Online/Cloud Synthesis
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, lang = 'es', slow = false } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      // google-tts-api limits each request to 200 chars
      // We can use getAllAudioUrl for longer text if needed, but for a demo we keep it simple
      const url = googleTTS.getAudioUrl(text.substring(0, 200), {
        lang,
        slow,
        host: 'https://translate.google.com',
      });

      res.json({ url });
    } catch (error) {
      console.error("TTS Error:", error);
      res.status(500).json({ error: "Failed to synthesize speech" });
    }
  });

  // API Route to proxy the audio for downloading as MP3
  app.get("/api/download-proxy", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).send("URL required");
      
      const response = await fetch(url as string);
      const buffer = await response.arrayBuffer();
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="voxsynth_export.mp3"');
      res.send(Buffer.from(buffer));
    } catch (error) {
      res.status(500).send("Proxy error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
