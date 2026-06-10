# COMMANDS

本文件集中记录 CompCheck（成分小查）当前可用命令。修改依赖、启动方式、构建方式或测试方式时需要同步更新。

## 环境要求

- Node.js >= 18
- 当前版本无第三方运行依赖，仍建议执行 `npm install` 生成并校验 lockfile。

## 环境变量

参考 `.env.example`。本项目不使用 Vite，环境变量不加 `VITE_` 前缀。

当前前端版本不读取任何环境变量。服务端密钥（OCR_API_KEY、AI_API_KEY）只在后端 Node.js 进程中读取，不传前端。

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
- 食品添加剂 E-number / INS 编码搜索
- 成分表文本拆分与匹配
- 食品添加剂成分表匹配和重点关注项输出
- 未知成分输出
- 过敏原枚举、食品数据校验和本地存储异常兜底
- AI/OCR 未配置时的降级返回

## 数据校验

```bash
npm run validate:data
```

当前校验食品添加剂数据的必填字段、枚举值、重复 id、来源字段和使用限量结构。

## 启动验证

```bash
npm run dev
curl -I http://127.0.0.1:5173/
```

预期返回：

```text
HTTP/1.1 200 OK
```
