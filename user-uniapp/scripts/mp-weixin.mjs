import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(rootDir, 'src', 'manifest.json');
const shellEnvKeys = new Set(Object.keys(process.env));

loadLocalEnvFile('.env');
loadLocalEnvFile('.env.local');

const appId = String(process.env.WEIXIN_MP_APPID || '').trim();
const apiBaseUrl = String(process.env.USER_API_BASE_URL || '').trim();
const urlCheck = String(process.env.WEIXIN_MP_URL_CHECK || '').trim().toLowerCase() === 'true';
const isDev = process.argv.includes('--dev');

const originalManifest = readFileSync(manifestPath, 'utf8');

try {
  const manifest = JSON.parse(originalManifest);
  manifest['mp-weixin'] = {
    ...(manifest['mp-weixin'] || {}),
    appid: appId || manifest['mp-weixin']?.appid || '',
    usingComponents: true,
    permission: {
      ...(manifest['mp-weixin']?.permission || {}),
      'scope.camera': {
        desc: '用于拍摄食品标签图片，完成标签文字识别和文本确认。'
      }
    },
    setting: {
      ...(manifest['mp-weixin']?.setting || {}),
      urlCheck
    }
  };

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  if (!appId) {
    console.warn('[mp-weixin] WEIXIN_MP_APPID is not set. The build can run, but WeChat DevTools must fill the AppID before real-device checks.');
  }
  if (!apiBaseUrl) {
    console.warn('[mp-weixin] USER_API_BASE_URL is not set. Non-H5 API calls will fall back to manual paths until a backend base URL is configured.');
  }

  const uniBin = join(rootDir, 'node_modules', '.bin', process.platform === 'win32' ? 'uni.cmd' : 'uni');
  const args = isDev ? ['-p', 'mp-weixin'] : ['build', '-p', 'mp-weixin'];
  const result = spawnSync(uniBin, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    process.exitCode = result.status || 1;
  } else {
    patchGeneratedProjectConfig();
  }
} finally {
  writeFileSync(manifestPath, originalManifest);
}

function patchGeneratedProjectConfig() {
  const projectConfigPath = join(rootDir, 'dist', 'build', 'mp-weixin', 'project.config.json');
  if (!existsSync(projectConfigPath)) return;

  const projectConfig = JSON.parse(readFileSync(projectConfigPath, 'utf8'));
  projectConfig.appid = appId || projectConfig.appid || '';
  projectConfig.setting = {
    ...(projectConfig.setting || {}),
    urlCheck
  };
  writeFileSync(projectConfigPath, `${JSON.stringify(projectConfig, null, 2)}\n`);
}

function loadLocalEnvFile(fileName) {
  const filePath = join(rootDir, fileName);
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimEnvValue(trimmed.slice(equalsIndex + 1).trim());
    if (!key || shellEnvKeys.has(key)) continue;

    process.env[key] = value;
  }
}

function trimEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
