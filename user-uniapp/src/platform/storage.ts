export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = uni.getStorageSync(key);
    if (!raw) return fallback;
    return JSON.parse(String(raw)) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  uni.setStorageSync(key, JSON.stringify(value));
}

export function removeStorage(key: string): void {
  uni.removeStorageSync(key);
}

export function readString(key: string, fallback = ''): string {
  try {
    return String(uni.getStorageSync(key) || fallback);
  } catch {
    return fallback;
  }
}

export function writeString(key: string, value: string): void {
  uni.setStorageSync(key, value);
}
