import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for all routes (crucial for Web Audio & streaming)
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  next();
});

const CACHE_DIR = path.join(process.cwd(), 'cache', 'audio');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Locate yt-dlp binary
const YT_DLP_PATH = fs.existsSync(path.join(process.cwd(), 'bin', 'yt-dlp'))
  ? path.join(process.cwd(), 'bin', 'yt-dlp')
  : 'yt-dlp';

// Helper to extract YouTube video ID from various formats
function extractVideoId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  return match ? match[1] : trimmed;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1. YouTube Metadata Endpoint (Uses fast, reliable YouTube oEmbed API without bot blocks)
app.get('/api/youtube-info', async (req, res) => {
  const query = (req.query.id as string) || (req.query.url as string);
  const videoId = extractVideoId(query);

  if (!videoId) {
    return res.status(400).json({ error: 'Missing or invalid YouTube video ID / URL' });
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      return res.json({
        id: videoId,
        title: data.title || `YouTube // ${videoId}`,
        uploader: data.author_name || 'YouTube Artist',
        duration: 180,
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }
  } catch (err) {
    // Non-blocking fallback
  }

  // Safe fallback metadata without invoking external subprocesses
  return res.json({
    id: videoId,
    title: `YOUTUBE LIVE // ${videoId}`,
    uploader: 'YouTube Music',
    duration: 180,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  });
});

// 2. YouTube Full Audio File Extraction & Caching Endpoint
// Returns high-quality MP3 for Web Audio decoding in AudioEngine (for complete DJ deck control)
app.get('/api/youtube-audio', async (req, res) => {
  const query = (req.query.id as string) || (req.query.url as string);
  const videoId = extractVideoId(query);

  if (!videoId) {
    return res.status(400).json({ error: 'Missing or invalid YouTube video ID / URL' });
  }

  const cachedFilePath = path.join(CACHE_DIR, `${videoId}.mp3`);

  // If already cached on disk, serve immediately!
  if (fs.existsSync(cachedFilePath)) {
    const stat = fs.statSync(cachedFilePath);
    if (stat.size > 1024) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const stream = fs.createReadStream(cachedFilePath);
      return stream.pipe(res);
    }
  }

  // Not yet cached: download & convert via yt-dlp + ffmpeg
  const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`[YouTube Extraction] Downloading audio for: ${videoId}`);

  const tempFilePath = path.join(CACHE_DIR, `${videoId}.temp.mp3`);

  const child = spawn(YT_DLP_PATH, [
    '-f', 'ba/b',
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '128k',
    '--no-playlist',
    '--no-warnings',
    '-o', tempFilePath,
    targetUrl,
  ]);

  let stderrData = '';
  child.stderr.on('data', (d) => {
    stderrData += d;
  });

  child.on('close', (code) => {
    if (code !== 0 || !fs.existsSync(tempFilePath)) {
      console.error(`yt-dlp conversion failed (code ${code}):`, stderrData);
      return res.status(500).json({
        error: 'Failed to extract audio from YouTube',
        details: stderrData.slice(0, 300),
      });
    }

    try {
      fs.renameSync(tempFilePath, cachedFilePath);
      const stat = fs.statSync(cachedFilePath);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const stream = fs.createReadStream(cachedFilePath);
      return stream.pipe(res);
    } catch (err: any) {
      console.error('Error caching audio file:', err);
      return res.status(500).json({ error: 'Error preparing audio response' });
    }
  });

  child.on('error', (err) => {
    console.error('Spawn error:', err);
    return res.status(500).json({ error: err.message });
  });
});

// 3. YouTube Direct Live Audio Stream (Chunked progressive streaming)
app.get('/api/youtube-stream', (req, res) => {
  const query = (req.query.id as string) || (req.query.url as string);
  const videoId = extractVideoId(query);

  if (!videoId) {
    return res.status(400).json({ error: 'Missing or invalid YouTube video ID / URL' });
  }

  const cachedFilePath = path.join(CACHE_DIR, `${videoId}.mp3`);
  if (fs.existsSync(cachedFilePath)) {
    const stat = fs.statSync(cachedFilePath);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');
    return fs.createReadStream(cachedFilePath).pipe(res);
  }

  const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Transfer-Encoding', 'chunked');

  const ytdlp = spawn(YT_DLP_PATH, [
    '-f', 'ba/b',
    '-o', '-',
    '--no-playlist',
    targetUrl,
  ]);

  const ffmpeg = spawn('ffmpeg', [
    '-i', 'pipe:0',
    '-vn',
    '-f', 'mp3',
    '-acodec', 'libmp3lame',
    '-b:a', '128k',
    'pipe:1',
  ]);

  ytdlp.stdout.pipe(ffmpeg.stdin);
  ffmpeg.stdout.pipe(res);

  req.on('close', () => {
    try {
      ytdlp.kill();
      ffmpeg.kill();
    } catch {}
  });
});

// Start Server and mount Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PULSE FX Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
