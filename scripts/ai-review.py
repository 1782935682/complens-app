#!/usr/bin/env python3
"""通用 AI PR 代码审查脚本，支持 DeepSeek / 阿里云百炼等 OpenAI 兼容接口。"""
import json
import os
import subprocess
import sys
import urllib.request

DIFF_PATH = '/tmp/pr.diff'
REVIEW_PATH = '/tmp/review.md'
MAX_DIFF_CHARS = 30000

PROMPT_TEMPLATE = """你是 CompCheck（成分小查）项目的代码审查员，请对以下 PR 变更进行详细审查，输出中文报告。

## 项目背景

- **产品**：食品添加剂查询 App（主线），化妆品成分（次线）
- **技术栈**：纯 JavaScript ES Modules，无框架、无 TypeScript、无打包工具（Vite/webpack 均禁止）
- **核心功能**：过敏原用户档案（全局警告）、多类别路由（/food/... 和 /cosmetics/...）

## 审查维度

1. **逻辑正确性** — 函数逻辑是否正确，边界条件和异常路径是否处理
2. **技术栈合规** — 是否引入禁止依赖（React / Vue / TypeScript / Vite 等）
3. **数据模型完整性** — 食品添加剂必填字段：id、nameCn、category、description、riskLevel、gbStatus、sourceNote；数组字段（allergenTypes、cautionFor、foodCategories）不得省略键名
4. **过敏原系统** — 存储 key 必须为 compcheck:allergens；接口须暴露 getUserAllergens() 和 setUserAllergens(ids)；搜索/详情/分析页须检查并高亮过敏原
5. **多类别路由** — resolveRoute() 返回值是否包含 category 字段；路由是否遵循 /food/... 和 /cosmetics/... 前缀
6. **安全性** — HTML 输出是否经过转义（防 XSS）；有无敏感信息硬编码
7. **代码质量** — 函数职责是否单一；是否存在重复逻辑；命名是否清晰

## 输出格式（严格按此结构输出，不要省略任何一节）

## {provider} 代码审查

### ✅ 做对的地方
（列出值得肯定的实现，附文件名）

### ⚠️ 需要关注
（可以改进的地方，附文件名和行号，说明原因）

### ❌ 必须修复
（错误或严重问题，附文件名和行号，说明如何修复）

### 总体评价
**通过** / **需要修改** / **不通过**（三选一加粗，后附一句说明）

---

## 本次 PR 变更

```diff
{diff}
```
"""


def get_diff():
    try:
        diff = open(DIFF_PATH).read()
    except FileNotFoundError:
        print('diff 文件不存在，跳过审查')
        sys.exit(0)
    if not diff.strip():
        print('diff 为空，跳过审查')
        sys.exit(0)
    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + '\n\n[... diff 过长，仅展示前 30000 字符 ...]'
    return diff


def call_api(diff, api_key, api_base, model, provider):
    prompt = PROMPT_TEMPLATE.format(diff=diff, provider=provider)
    payload = json.dumps({
        'model': model,
        'messages': [
            {'role': 'user', 'content': prompt},
        ],
        'max_tokens': 3000,
        'temperature': 0.3,
    }).encode('utf-8')

    url = api_base.rstrip('/') + '/chat/completions'
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
    )
    resp = urllib.request.urlopen(req, timeout=120)
    result = json.loads(resp.read())
    return result['choices'][0]['message']['content']


def post_comment(review, pr_number, repo):
    with open(REVIEW_PATH, 'w') as f:
        f.write(review)
    subprocess.run(
        ['gh', 'pr', 'comment', pr_number, '--repo', repo, '--body-file', REVIEW_PATH],
        check=True,
    )


def main():
    api_key  = os.environ.get('AI_API_KEY', '')
    api_base = os.environ.get('AI_API_BASE', '')
    model    = os.environ.get('AI_MODEL', '')
    provider = os.environ.get('AI_PROVIDER', 'AI')
    pr_number = os.environ.get('PR_NUMBER', '')
    repo      = os.environ.get('REPO', '')

    if not api_key:
        msg = f'⚠️ **{provider} API Key 未配置**，无法完成代码审查。\n\n请在仓库 `Settings → Secrets → Actions` 中添加对应的 Secret。'
        post_comment(msg, pr_number, repo)
        sys.exit(0)

    diff = get_diff()

    try:
        review = call_api(diff, api_key, api_base, model, provider)
    except Exception as e:
        review = f'⚠️ {provider} 审查请求失败：{e}\n\n请检查 API Key 是否正确配置。'

    post_comment(review, pr_number, repo)
    print(f'{provider} 审查评论已发布')


if __name__ == '__main__':
    main()
