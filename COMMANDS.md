# COMMANDS

本文件集中记录 CompCheck（成分小查）当前可用命令。修改依赖、启动方式、构建方式或测试方式时需要同步更新。

## 环境要求

- Node.js >= 18
- 当前版本无第三方运行依赖，仍建议执行 `npm install` 生成并校验 lockfile。

## 环境变量

参考 `.env.example`：

```env
VITE_API_BASE_URL=
VITE_APP_NAME=成分小查
```

当前前端版本不会读取真实密钥，也不在前端暴露 AI/OCR 服务密钥。

## 安装依赖

```bash
npm install
```

## 本地启动

```bash
npm run dev
```

默认地址：

```text
http://127.0.0.1:5173
```

可通过环境变量调整：

```bash
HOST=127.0.0.1 PORT=5174 npm run dev
```

## 构建

```bash
npm run build
```

构建产物输出到 `dist/`，该目录为生成物，不纳入版本管理。

## 代码检查

```bash
npm run lint
```

当前检查内容：

- JavaScript 语法检查
- `src/` 文案合规扫描

## 测试

```bash
npm run test
```

当前覆盖：

- 成分中文、英文和别名搜索
- 成分表文本拆分与匹配
- 未知成分输出
- AI/OCR 未配置时的降级返回

## 启动验证

```bash
npm run dev
curl -I http://127.0.0.1:5173/
```

预期返回：

```text
HTTP/1.1 200 OK
```
