#!/usr/bin/env python3
"""DeepSeek PR 代码审查脚本，由 GitHub Actions 调用。"""
import json
import os
import subprocess
import sys
import urllib.request

DIFF_PATH = '/tmp/pr.diff'
REVIEW_PATH = '/tmp/review.md'
MAX_DIFF_CHARS = 100000

PROMPT_SYSTEM = """你是 CompCheck（成分小查）项目的代码审查员。
请对 PR 变更进行详细审查，输出中文报告，严格按照要求的格式。"""

PROMPT_TEMPLATE = """请审查以下 PR 变更。

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

## 严重问题报告限制（必须遵守）

- 只把 diff 中可以直接证明的确定性错误列入「❌ 必须修复」。
- 禁止把"可能"、"无法确认"、"未来扩展时"、"diff 未展示"、"数据库可能没有"这类推测列为必须修复。
- 禁止因为上下文未出现在 diff 片段中，就假设函数不存在、导入未使用、字段未定义或数据未收录。
- 若代码已有 guard，或测试、lint、构建、数据校验已覆盖该路径，不得列为阻断项。
- 样例里普通食品原料进入 unknownItems 是允许行为；只要 UI 明确说明其不是食品添加剂匹配项，不得列为严重问题。

## 输出格式（严格按此结构输出，不要省略任何一节）

## DeepSeek 代码审查

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
        print("diff 文件不存在，跳过审查")
        sys.exit(0)
    if not diff.strip():
        print("diff 为空，跳过审查")
        sys.exit(0)
    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + f'\n\n[... diff 过长，仅展示前 {MAX_DIFF_CHARS} 字符 ...]'
    return diff


def call_deepseek(diff, api_key):
    prompt = PROMPT_TEMPLATE.format(diff=diff)
    payload = json.dumps({
        'model': 'deepseek-chat',
        'messages': [
            {'role': 'system', 'content': PROMPT_SYSTEM},
            {'role': 'user', 'content': prompt},
        ],
        'max_tokens': 5000,
        'temperature': 0.3,
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.deepseek.com/v1/chat/completions',
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
    api_key = os.environ.get('DEEPSEEK_API_KEY', '')
    pr_number = os.environ.get('PR_NUMBER', '')
    repo = os.environ.get('REPO', '')

    if not api_key:
        print('DEEPSEEK_API_KEY 未配置，跳过审查')
        sys.exit(0)

    diff = get_diff()

    try:
        review = call_deepseek(diff, api_key)
    except Exception as e:
        review = f'⚠️ DeepSeek 审查请求失败：{e}\n\n请检查 DEEPSEEK_API_KEY 是否正确配置。'

    post_comment(review, pr_number, repo)
    print('审查评论已发布')


if __name__ == '__main__':
    main()
