const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

let cachedCommand = null;

/**
 * Find working yt-dlp command on this machine
 */
async function getWorkingCommand() {
  if (cachedCommand) return cachedCommand;

  const candidates = [
    'yt-dlp',
    'python3 -m yt_dlp',
    'python -m yt_dlp',
    path.join(process.cwd(), 'yt-dlp')
  ];

  for (const cmd of candidates) {
    try {
      await new Promise((resolve, reject) => {
        exec(`${cmd} --version`, { timeout: 4000 }, (err, stdout) => {
          if (err || !stdout.trim()) reject(err || new Error('empty version'));
          else resolve(stdout.trim());
        });
      });
      console.log(`[yt-dlp] Found working command: "${cmd}"`);
      cachedCommand = cmd;
      return cmd;
    } catch (e) {
      // try next
    }
  }

  // If on Linux/Render and not found, try downloading standalone binary
  if (process.platform === 'linux') {
    const localBinary = path.join(process.cwd(), 'yt-dlp');
    console.log('[yt-dlp] Standalone binary not found, downloading to:', localBinary);
    try {
      await downloadLinuxBinary(localBinary);
      fs.chmodSync(localBinary, 0o755);
      cachedCommand = localBinary;
      return localBinary;
    } catch (dlErr) {
      console.error('[yt-dlp] Failed to download binary:', dlErr.message);
    }
  }

  throw new Error('yt-dlp is not available. Please install via pip: pip install -U yt-dlp');
}

function downloadLinuxBinary(destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redirectRes) => {
          redirectRes.pipe(file);
          file.on('finish', () => file.close(resolve));
        }).on('error', reject);
      } else {
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }
    }).on('error', reject);
  });
}

/**
 * Dump video metadata and captions using yt-dlp
 */
async function getVideoMetadata(videoId) {
  const cmd = await getWorkingCommand();
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const fullCmd = `${cmd} --dump-json --skip-download --no-warnings --no-playlist "${url}"`;

  return new Promise((resolve, reject) => {
    exec(fullCmd, { maxBuffer: 25 * 1024 * 1024, timeout: 30000 }, (err, stdout, stderr) => {
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
