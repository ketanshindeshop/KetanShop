import app, { warmupImageCache } from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`🚀 Shriram Traders API running on http://localhost:${PORT}`);
  // Warm up the image cache so first image requests are served from memory instantly
  await warmupImageCache();
});
