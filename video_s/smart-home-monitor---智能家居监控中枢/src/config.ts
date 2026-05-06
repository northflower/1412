/** ESP32-S3：HTTP 视频流 + HTTP 告警 API */

export const CAMERA_STORAGE_HOST = 'esp32_https_camera_host';
export const LOG_PANEL_ENABLED_KEY = 'sm_monitor_logs_panel_enabled';

const CAMERA_USE_HTTPS = false;

export const APP_CONFIG = {
  api: {
    latestAlertsPath: '/api/alerts',
    latestAlertsLimit: 1,
    telemetryPath: '/api/telemetry',
    ptzPath: '/api/ptz',
    searchPath: '/api/search',
    trackRefreshPath: '/api/track/refresh',
    modePath: '/api/mode',
  },
  camera: {
    useHttps: CAMERA_USE_HTTPS,
    defaultHost: '172.20.10.3',
    defaultPort: null as number | null,
    streamPath: '/stream',
    capturePath: '/capture',
  },
  polling: {
    intervalMs: 1000,
  },
  events: {
    fire_alarm: {
      title: '火灾警报',
      message: '紧急：检测到明火！',
    },
    smoke_alarm: {
      title: '烟雾警报',
      message: '异常：检测到浓烟！',
    },
    fall_detected: {
      title: '人员跌倒',
      message: '警告：检测到人员跌倒！',
    },
  },
  ui: {
    unknownEventTitle: '未知警报',
    unknownEventMessagePrefix: '异常：收到未知事件',
    apiOk: '告警接口连接正常',
    streamFail: '视频流加载失败（检查 HTTP / IP / 端口）',
  },
} as const;

export type AlertOut = {
  device_id: string;
  event_type: string;
  confidence: number;
  source_timestamp?: string | null;
  received_at: string;
  level: string;
  message: string;
};

export type EventMapEntry = { title: string; message: string };

function normalizeHost(host: string): string {
  return host
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

/**
 * 告警 API 地址
 * 改完后会访问：
 * http://你输入的ESP32_IP/api/alerts?limit=1
 */
export function getApiOrigin(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const savedHost =
    localStorage.getItem(CAMERA_STORAGE_HOST) || APP_CONFIG.camera.defaultHost;

  const host = normalizeHost(savedHost);

  return `http://${host}`;
}

export function getAlertsUrl(limit: number): string {
  const base = getApiOrigin();
  const path = `${APP_CONFIG.api.latestAlertsPath}?limit=${limit}`;
  return `${base}${path}`;
}

export function apiUrl(path: string): string {
  const base = getApiOrigin();
  return `${base}${path}`;
}

export async function postJson(path: string, body: unknown): Promise<unknown> {
  const url = apiUrl(path);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status}`);
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function cameraScheme(): string {
  return APP_CONFIG.camera.useHttps ? 'https' : 'http';
}

export function cameraPortSuffix(port: number | null): string {
  if (port == null || Number.isNaN(port)) return '';
  if (APP_CONFIG.camera.useHttps && port === 443) return '';
  if (!APP_CONFIG.camera.useHttps && port === 80) return '';
  return `:${port}`;
}

/**
 * 视频地址
 * 改完后会访问：
 * http://你输入的ESP32_IP/stream
 */
export function cameraOrigin(host: string, port: number | null): string {
  const h = normalizeHost(host);
  return `${cameraScheme()}://${h}${cameraPortSuffix(port)}`;
}

export function getStreamUrl(host: string, port: number | null): string {
  return `${cameraOrigin(host, port)}${APP_CONFIG.camera.streamPath}`;
}

export function getCaptureUrl(host: string, port: number | null): string {
  return `${cameraOrigin(host, port)}${APP_CONFIG.camera.capturePath}`;
}

export function fingerprintAlert(alert: AlertOut | null): string {
  if (!alert) return '';
  return [
    alert.device_id ?? '',
    alert.event_type ?? '',
    alert.confidence ?? '',
    alert.received_at ?? '',
  ].join('|');
}

export function mapEventForDisplay(eventType: string): EventMapEntry {
  const k = String(eventType ?? '').toLowerCase() as keyof typeof APP_CONFIG.events;
  const mapped = APP_CONFIG.events[k];
  if (mapped) return { title: mapped.title, message: mapped.message };
  return {
    title: APP_CONFIG.ui.unknownEventTitle,
    message: `${APP_CONFIG.ui.unknownEventMessagePrefix} ${eventType || 'unknown'}`,
  };
}