const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

function downloadWithRedirects(url, dest, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(downloadWithRedirects(res.headers.location, dest, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP status ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  console.log('[postinstall] Checking yt-dlp availability...');

  // 1. Check if already installed in system
  for (const cmd of ['yt-dlp', 'python3 -m yt_dlp', 'python -m yt_dlp']) {
    try {
      const v = execSync(`${cmd} --version`, { stdio: 'pipe' }).toString().trim();
      console.log(`[postinstall] Found system ${cmd} (version ${v})`);
      return;
    } catch (e) {}
  }

  // 2. Try installing via pip
  console.log('[postinstall] Attempting to install yt-dlp via pip...');
  for (const pipCmd of [
    'pip install -U yt-dlp',
    'pip3 install -U yt-dlp',
    'python3 -m pip install -U yt-dlp',
    'python -m pip install -U yt-dlp'
  ]) {
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

    // Try native curl first (fastest and most reliable on Linux)
    try {
      execSync(`curl -L -o "${dest}" https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && chmod +x "${dest}"`, { stdio: 'inherit' });
      const v = execSync(`"${dest}" --version`, { stdio: 'pipe' }).toString().trim();
      console.log(`[postinstall] Standalone yt-dlp downloaded and verified via curl (version ${v})`);
      return;
    } catch (curlErr) {
      console.log('[postinstall] curl failed, using https stream with redirect handling...');
    }

    try {
      await downloadWithRedirects('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', dest);
      fs.chmodSync(dest, 0o755);
      const v = execSync(`"${dest}" --version`, { stdio: 'pipe' }).toString().trim();
      console.log(`[postinstall] Standalone yt-dlp ready (version ${v})`);
      return;
    } catch (err) {
      console.warn('[postinstall] Failed to download standalone binary:', err.message);
    }
  }

  console.log('[postinstall] Finished checking yt-dlp.');
}

main().catch(err => {
  console.warn('[postinstall] Warning during yt-dlp setup:', err.message);
});
