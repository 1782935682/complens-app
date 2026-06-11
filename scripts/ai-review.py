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

PROMPT_TEMPLATE = """你是 CompCheck（成分小查）项目的代码审查员。

## 审查规则（必须遵守）

1. **只报告严重问题**，不报告风格、命名、注释、格式等次要问题——这些由开发者自己处理。
2. **必须一次性列出本次 PR 中所有严重问题**，不能遗漏任何一个。每次 PR 只能审查一次，不允许后续补充。
3. 如果没有严重问题，直接写"✅ 无严重问题，通过"。

## 严重问题定义（满足任一条即需报告）

- 逻辑错误：条件判断错误、边界情况未处理、数据流断裂
- 功能缺失：README 第 24–27 节规定的必要实现未完成（多类别路由 category 字段、过敏原 key/接口、食品字段必填项）
- 安全漏洞：HTML 未转义（XSS）、API Key 硬编码
- 技术栈违规：引入禁止依赖（React / Vue / TypeScript / Vite / webpack 等）
- 数据损坏风险：写入数据结构破坏已有数据、localStorage key 冲突

## 项目背景（审查依据）

- **技术栈**：纯 JavaScript ES Modules，无框架、无 TypeScript、无打包工具
- **路由**：resolveRoute() 必须返回包含 category 字段的对象；路由遵循 /food/... 和 /cosmetics/... 前缀
- **过敏原**：存储 key 为 compcheck:allergens；接口须暴露 getUserAllergens() 和 setUserAllergens(ids)
- **食品数据**：必填字段 id、nameCn、category、description、riskLevel、gbStatus、sourceNote；数组字段不得省略键名

## 输出格式

## {provider} 审查结果

### ❌ 严重问题清单
（逐条列出，每条格式：`文件名:行号` — 问题描述 — 修复建议）
（若无严重问题，此处写"无"）

### 总体结论
**通过** / **不通过**（二选一加粗，后附一句说明）

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
        'max_tokens': 5000,
        'temperature': 0.0,
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
