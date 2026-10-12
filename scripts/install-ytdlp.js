const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: status ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('[postinstall] Checking yt-dlp availability...');

  // 1. Check if already installed
  for (const cmd of ['yt-dlp', 'python3 -m yt_dlp', 'python -m yt_dlp']) {
    try {
      const v = execSync(`${cmd} --version`, { stdio: 'pipe' }).toString().trim();
      console.log(`[postinstall] Found ${cmd} (version ${v})`);
      return;
    } catch (e) {}
  }

  // 2. Try installing via pip
  console.log('[postinstall] Attempting to install yt-dlp via pip...');
  for (const pipCmd of ['pip install -U yt-dlp', 'python3 -m pip install -U yt-dlp', 'python -m pip install -U yt-dlp']) {
    try {
      execSync(pipCmd, { stdio: 'inherit' });
      console.log(`[postinstall] Successfully installed yt-dlp using "${pipCmd}"`);
      return;
    } catch (e) {}
  }

  // 3. If on Linux (Render), download standalone binary
  if (process.platform === 'linux') {
    const dest = path.join(process.cwd(), 'yt-dlp');
    console.log('[postinstall] Downloading Linux standalone yt-dlp binary to:', dest);
    try {
      await downloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', dest);
      fs.chmodSync(dest, 0o755);
      console.log('[postinstall] Standalone yt-dlp binary ready');
      return;
    } catch (err) {
      console.warn('[postinstall] Failed to download standalone binary:', err.message);
    }
  }

  console.log('[postinstall] Finished checking yt-dlp.');
}

main().catch(err => {
  console.warn('[postinstall] Warning:', err.message);
  // Do not fail npm install
  process.exit(0);
});
