# 智能家居监控中枢

## 数据流说明（重要）

- **浏览器（本前端）与 `alert_listener` 之间：全部为 HTTP**（`GET` 拉告警与遥测，`POST` 下发云台 / 模式 / 查找 / 追踪等）。
- **设备 / 边缘节点 → 中枢服务**：请使用 **`POST /api/ingest/alert`**、 **`POST /api/ingest/sensor`** 上报告警与温度（JSON 形状见下文）。`alert_listener` **已移除 MQTT**，无需也不支持 Broker。

---

## 前置条件

- 已安装 **Node.js**（[LTS 官网](https://nodejs.org/)），安装时勾选 **Add to PATH**。装好后**关掉并重新打开**终端，否则仍会找不到 `npm`。
- 在项目目录执行命令（不要只在 `E:\MQTT` 根目录跑）  
  `E:\MQTT\smart-home-monitor---智能家居监控中枢`

## 启动前端

**PowerShell（若不支持 `&&`，用分号）：**

```powershell
cd "E:\MQTT\smart-home-monitor---智能家居监控中枢"; npm install; npm run dev
```

**命令提示符 cmd：**

```bat
cd /d "E:\MQTT\smart-home-monitor---智能家居监控中枢" && npm install && npm run dev
```

启动后打开 **http://localhost:3000**。

开发环境下，`vite.config.ts` 将 **`/api/*`** 代理到 **`http://127.0.0.1:8000`**（与仓库根目录 `alert_listener.py` 默认端口一致）。生产构建后，前端请求 **`https://{页面主机}:8443`**（见 `src/config.ts`）。

---

## 页面控件 → 行为说明

| 界面位置 | 控件 | 是否 HTTP 调中枢 | 说明 |
|---------|------|-------------------|------|
| 顶栏 | 浅色 / 深色 | 否 | 仅切换主题 |
| 顶栏 | 设置 | 否 | 本地设置弹窗 |
| 视频区 | 重调流 / 抓拍 | 否 | 直连摄像头 **`GET https://{主机}/stream`**、`/capture` |
| 左下 | 环境温度 | 是（轮询） | **`GET /api/telemetry`** |
| 左下 | 云台方向键 | 是 | **`POST /api/ptz`** |
| 右侧 | 模式切换 | 是 | **`POST /api/mode`** |
| 右侧 | 重置系统状态 | 否 | 仅前端状态 |
| 右侧 | 查找 | 是 | **`POST /api/search`** |
| 右侧 | 刷新追踪 | 是 | **`POST /api/track/refresh`** |
| 右侧 | 监控日志 | 否 | 本地内存 |
| 全局 | 告警轮询 | 是 | **`GET /api/alerts?limit=1`** |

### 告警类型（与面板联动）

仅当 **`event_type`**（不区分大小写）为 `fire_alarm`、`smoke_alarm`、`fall_detected` 时进入红色告警态。

---

## `alert_listener.py`（FastAPI）接口

**约定：** `POST` 使用 JSON，`Content-Type: application/json`。

### 1. 服务状态 — `GET /api/status`

响应中的 **`ingest`** 含 **`http_alert`**、**`http_sensor`**（均为 `true`），表示设备经 HTTP 上报入口接入。

### 2. 设备 HTTP 上报 — 告警

| 项目 | 值 |
|------|-----|
| 方法 | `POST` |
| 路径 | `/api/ingest/alert` |

**请求体示例：**

```json
{
  "device_id": "esp32-001",
  "event_type": "fall_detected",
  "confidence": 0.92,
  "timestamp": "optional ISO or any string"
}
```

写入后与 **`GET /api/alerts`** 返回结构一致（服务端会补全 `received_at`、`level`、`message` 等）。

### 3. 设备 HTTP 上报 — 传感器温度

| 项目 | 值 |
|------|-----|
| 方法 | `POST` |
| 路径 | `/api/ingest/sensor` |

**请求体：** 至少包含 **`temperature_celsius`** 或 **`temperature`** 之一（数值）。

```json
{ "temperature_celsius": 24.5 }
```

### 4. 最新告警列表 — `GET /api/alerts?limit=1`

响应为 **`AlertOut` 对象数组**（前端默认取最新 1 条）。

### 5. 环境温度 — `GET /api/telemetry`

```json
{ "temperature_celsius": 24.5 }
```

无数据时为 `null`；**本前端在无有效值时界面默认显示 24°C**。

### 6. 云台 — `POST /api/ptz`

```json
{ "message_type": "移动", "direction": 1 }
```

**1＝上，2＝下，3＝左，4＝右**。

### 7. 查找 — `POST /api/search`

```json
{ "query": "关键字" }
```

### 8. 刷新追踪 — `POST /api/track/refresh`

```json
{ "action": "refresh_track" }
```

### 9. 界面模式 — `POST /api/mode`

```json
{ "mode": "monitor" }
```

取值：`monitor` | `search` | `track`。

---

## 摄像头（浏览器直连）

| 用途 | URL |
|------|-----|
| MJPEG | `https://{host}/stream?t=...` |
| 抓拍 | `https://{host}/capture?t=...` |

配置见 `src/config.ts` 中 **`APP_CONFIG.camera`**。
