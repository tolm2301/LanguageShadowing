const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

let cachedCommand = null;

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

/**
 * Find working yt-dlp command on this machine
 */
async function getWorkingCommand() {
  if (cachedCommand) return cachedCommand;

  const localBinary = path.join(process.cwd(), 'yt-dlp');
  const candidates = [
    'yt-dlp',
    'python3 -m yt_dlp',
    'python -m yt_dlp',
    localBinary,
    `"${localBinary}"`
  ];

  for (const cmd of candidates) {
    try {
      const version = await new Promise((resolve, reject) => {
        exec(`${cmd} --version`, { timeout: 4000 }, (err, stdout) => {
          if (err || !stdout.trim()) reject(err || new Error('empty version'));
          else resolve(stdout.trim());
        });
      });
      console.log(`[yt-dlp] Found working command: "${cmd}" (v${version})`);
      cachedCommand = cmd;
      return cmd;
    } catch (e) {
      // try next
    }
  }

  // If on Linux/Render and not found yet, try downloading standalone binary
  if (process.platform === 'linux') {
    console.log('[yt-dlp] Binary not found, downloading to:', localBinary);
    try {
      await downloadWithRedirects('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', localBinary);
      fs.chmodSync(localBinary, 0o755);
      cachedCommand = localBinary;
      return localBinary;
    } catch (dlErr) {
      console.error('[yt-dlp] Failed to download binary:', dlErr.message);
    }
  }

  throw new Error('yt-dlp is not available. Please install via pip: pip install -U yt-dlp');
}

/**
 * Dump video metadata and captions using yt-dlp
 */
async function getVideoMetadata(videoId, cookieString = null) {
  const cmd = await getWorkingCommand();
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // Method A (Android client without webpage fetch - bypasses cloud datacenter bot protection):
  const argsA = [
    '--dump-json',
    '--skip-download',
    '--no-warnings',
    '--no-playlist',
    '--extractor-args', '"youtube:player_client=android;player_skip=webpage,configs"'
  ];

  if (cookieString && cookieString.trim()) {
    const escaped = cookieString.replace(/"/g, '\\"');
    argsA.push('--add-header', `"Cookie: ${escaped}"`);
  }

  try {
    return await executeYtDlp(cmd, argsA, url);
  } catch (errA) {
    console.warn('[yt-dlp] Direct android extraction failed, trying fallback client:', errA.message);

    // Method B fallback: android client with web configs
    const argsB = [
      '--dump-json',
      '--skip-download',
      '--no-warnings',
      '--no-playlist',
      '--extractor-args', '"youtube:player_client=android"'
    ];
    if (cookieString && cookieString.trim()) {
      const escaped = cookieString.replace(/"/g, '\\"');
      argsB.push('--add-header', `"Cookie: ${escaped}"`);
    }

    return await executeYtDlp(cmd, argsB, url);
  }
}

function executeYtDlp(cmd, args, url) {
  const fullCmd = `${cmd} ${args.join(' ')} "${url}"`;

  return new Promise((resolve, reject) => {
    exec(fullCmd, { maxBuffer: 35 * 1024 * 1024, timeout: 35000 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`yt-dlp error: ${stderr || err.message}`));
      }
      try {
        const json = JSON.parse(stdout);
        resolve(json);
      } catch (parseErr) {
        reject(new Error(`Failed to parse yt-dlp output: ${parseErr.message}`));
      }
    });
  });
}

module.exports = {
  getWorkingCommand,
  getVideoMetadata
};
