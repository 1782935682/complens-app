# GEMINI.md - CompCheck (成分小查) Developer & Agent Guide

This document serves as the foundational instruction and development context manual for **CompCheck (成分小查)**. Any AI developer agent or human engineer working on this repository must read, understand, and strictly adhere to the guidelines, architectures, constraints, and commands detailed below.

---

## 1. Project Overview & Positioning

### 1.1 Product Definition
**CompCheck (成分小查)** is a mobile-first Single Page Application (SPA) designed for general consumers to look up, identify, and understand ingredients in foods and cosmetics.

### 1.2 Category Priorities & Roadmap
The application serves multiple ingredient categories under a single underlying architecture, managing data, standards, and safety statements independently per category.

| Category | Priority | Data Standard & References | Description |
| :--- | :--- | :--- | :--- |
| **食品添加剂 (Food Additives)** | **Mainline (P0 / Core)** | GB 2760, Codex Alimentarius, EU E-Numbers | Search, risk check, allergen warning, maximum limits. |
| **食品天然原料 (Natural Foods)** | Phase 2 | Chinese Food Composition Table, USDA | Nutritional values, organic/natural standards. |
| **营养成分 (Nutrition)** | Phase 3 | Chinese Food Composition Table, GB 28050 | Macronutrients, micronutrients, Daily Value (DV) reference. |
| **化妆品成分 (Cosmetics)** | Parallel | NMPA raw materials, INCI Standards | Safe concentration, hazard levels, allergen indicators. |

---

## 2. Core Architecture & Tech Stack

To maintain clean, lightweight, and ultra-high-performance rendering, **CompCheck** operates under rigid tech-stack constraints. No external frameworks or compiling steps are permitted without explicit architectural approval.

### 2.1 Tech Stack Specifications
*   **Language:** Pure JavaScript (ES2022+). **Strictly no TypeScript**. Types are declared and documented using rich JSDoc syntax in `src/types/`.
*   **Module System:** Native ES Modules (`"type": "module"`). Use standard `import` and `export` statements (always include explicit file extensions like `.js`).
*   **Framework:** Frameworkless. No React, Vue, Angular, or Svelte.
*   **Bundling/Transpilation:** None. No Vite, Webpack, Rollup, Parcel, or esbuild.
*   **Router:** Built-in custom Hash-Based Router (`window.location.hash` + `hashchange`).
*   **Styling:** Single global file (`src/styles.css`). Vanilla CSS only. No Tailwind, Sass, Less, CSS-in-JS, or other frameworks/preprocessors.
*   **State Management:** Module-level state variables, functional updates, and local storage serialization. No Redux, Pinia, Zustand, or MobX.
*   **Test Framework:** Node.js native `node:assert/strict` and testing runner (`scripts/test.mjs`). No Jest, Vitest, or Mocha.
*   **Linter:** Custom script-based validation (`scripts/lint.mjs`). No ESLint.
*   **Database & Servers:** Currently operates fully client-side via LocalStorage and embedded JSON/JS static files. Pre-arranged interfaces exist for eventual backend-proxy integration.

### 2.2 Prohibited Dependencies
Do not install or introduce:
1.  Any JS framework or TypeScript compiler.
2.  Any bundle manager/transpiler (Vite, webpack, etc.).
3.  Any CSS framework (Tailwind CSS, Bootstrap, etc.).
4.  Any complex state-management or third-party DOM-manipulation libraries (e.g., jQuery).

---

## 3. Directory Structure

```text
/home/downloads/git/compcheck/
├── package.json               # Project manifest & scripts
├── readme.md                  # Team development instructions (Read-Only reference)
├── COMMANDS.md                # List of executable project commands (Auto-Updated)
├── PROJECT_PLAN.md            # Comprehensive project plan & completion metrics
├── AI_REVIEW.md               # Active PR review material (Overwritten per iteration)
├── scripts/                   # Workspace tool scripts
│   ├── dev-server.mjs         # Custom Node.js HTTP dev server
│   ├── build.mjs              # Custom asset copy / build script
│   ├── lint.mjs               # Custom JS and compliance scanner
│   ├── test.mjs               # Node-native assertion tests
│   └── validate-data.mjs      # Food additives database schema validator
└── src/                       # Frontend source directory
    ├── index.html             # Application mounting container
    ├── main.js                # App entry point & global event bindings
    ├── styles.css             # Unified application-wide styling sheet
    ├── components/            # Reusable DOM rendering functions
    │   └── render.js          # Shared presentation templates
    ├── data/                  # Static database seed files
    │   ├── allergens.js       # Standard 14-allergen definitions
    │   ├── categories.js      # Global category helpers
    │   ├── cosmetic-ingredients.js # Cosmetic seed data (previously ingredients.js)
    │   └── foodAdditives.js   # Food additives database
    ├── pages/                 # View-specific DOM page renderers
    │   ├── homePage.js        # Home Page (Category selection / search portal)
    │   ├── searchPage.js      # Search Results list page
    │   ├── detailPage.js      # Ingredient/Additive Details page
    │   ├── analyzePage.js     # Ingredient text list parser and analyzer
    │   ├── favoritesPage.js   # Favorites page (with category-isolated tabs)
    │   └── settingsPage.js    # User Settings / Allergen Archive configuration
    ├── router/
    │   └── router.js          # Route resolution and dispatcher
    ├── services/              # Business logic & side-effect managers
    │   ├── aiAnalysisService.js # Pre-arranged AI prompt & proxy endpoint
    │   ├── allergenService.js # Cross-cutting allergen search and matcher
    │   ├── ingredientService.js # Core ingredient retrieval and parsing engine
    │   ├── ocrService.js      # Pre-arranged OCR proxy endpoint
    │   └── storageService.js  # Safe localStorage access wrapper (with memory-fallback)
    ├── store/
    │   └── userStore.js       # Global user-state (Favorites, Search History, Allergens)
    ├── types/
    │   └── ingredient.js      # Rich JSDoc typedef declarations
    └── utils/
        └── text.js            # Text cleanups, normalizers, and bracket sanitizers
```

---

## 4. Key Data Models

All custom data objects are typed via JSDoc defined in `src/types/ingredient.js`.

### 4.1 FoodAdditive (食品添加剂 - Mainline)
```js
/**
 * @typedef {'low' | 'medium' | 'high' | 'unknown'} RiskLevel
 * @typedef {'permitted' | 'restricted' | 'prohibited' | 'unknown'} GBStatus
 * @typedef {'draft' | 'reviewed' | 'verified'} DataReviewStatus
 * @typedef {'pregnant' | 'infant' | 'child' | 'diabetic' | 'renal' | 'sensitive'} ConsumerGroup
 * @typedef {'celery' | 'cereals-gluten' | 'crustaceans' | 'eggs' | 'fish' | 'lupin' | 'milk' | 'molluscs' | 'mustard' | 'peanuts' | 'sesame' | 'soybeans' | 'sulphites' | 'tree-nuts'} AllergenType
 *
 * @typedef {Object} SourceReference
 * @property {string} title                 - Title of reference standard (e.g. "GB 2760-2014")
 * @property {string} standard              - Exact standard or regulation code
 * @property {string=} region               - Applicable territory (e.g., "CN", "EU")
 * @property {string=} url                  - Direct verification hyperlink
 * @property {string=} publishedAt          - Standard release date (YYYY-MM-DD)
 *
 * @typedef {Object} UsageLimit
 * @property {string} foodCategory          - Targeted food classification (e.g., "碳酸饮料")
 * @property {string} limit                 - Maximum concentration (e.g., "0.2 g/kg")
 * @property {string=} note                 - Special condition or exemption notes
 *
 * @typedef {Object} FoodAdditive
 * @property {string} id                    - Unique ID (kebab-case, e.g., "sodium-benzoate")
 * @property {'food-additive'} kind         - Fixed value: 'food-additive'
 * @property {'food'} dataCategory          - Fixed value: 'food'
 * @property {string} nameCn                - Main Chinese name
 * @property {string=} nameEn               - Official English name
 * @property {string[]=} aliases            - Alternative names / synonyms
 * @property {string} gbCode                - GB 2760 INS code (e.g., "INS 211")
 * @property {GBStatus} gbStatus            - GB Regulation Status
 * @property {string=} eNumber              - EU index code (e.g., "E211")
 * @property {string} category              - Core additive classification (e.g., "防腐剂")
 * @property {string[]=} functions          - Specific functions
 * @property {string} description           - User-friendly objective description
 * @property {RiskLevel} riskLevel          - General hazard estimation level
 * @property {string=} riskSummary          - Description of specific risks
 * @property {UsageLimit[]} usageLimits     - Usage restriction tables from GB 2760
 * @property {string[]} foodCategories      - Permitted food categories
 * @property {AllergenType[]} allergenTypes - Associated allergens (mapped from standard list)
 * @property {ConsumerGroup[]} cautionGroups - Targeted user cautionary cohorts
 * @property {string} sourceNote            - Brief source summary (e.g., "GB 2760-2014 表 A.1")
 * @property {SourceReference[]} sourceReferences - Traceable verification standards
 * @property {DataReviewStatus} reviewStatus- Data audit state
 * @property {string} dataVersion           - Version string (e.g., "1.0.0")
 * @property {string} updatedAt             - ISO date format (YYYY-MM-DD)
 */
```

### 4.2 Standard Allergens
Standard allergens are maintained in `src/data/allergens.js` (standardized to 14 classes matching international food rules).

| ID | Chinese Name (nameCn) | English Name (nameEn) |
| :--- | :--- | :--- |
| `peanuts` | 花生 | Peanuts |
| `milk` | 牛奶/乳制品 | Milk |
| `eggs` | 鸡蛋 | Eggs |
| `cereals-gluten` | 小麦/麸质 | Wheat/Gluten |
| `soybeans` | 大豆 | Soybeans |
| `tree-nuts` | 坚果 | Tree nuts |
| `fish` | 鱼类 | Fish |
| `crustaceans` | 贝类/甲壳类 | Crustacean shellfish |
| `sesame` | 芝麻 | Sesame |
| `mustard` | 芥末 | Mustard |
| `celery` | 芹菜 | Celery |
| `lupin` | 羽扇豆 | Lupin |
| `molluscs` | 软体动物 | Molluscs |
| `sulphites` | 亚硫酸盐 | Sulphur dioxide/Sulphites |

---

## 5. Routing, Path Selection, & Resolution

### 5.1 Route Map
Navigation is controlled using Hash URLs (`#/`). To support multiple domains, routes containing specific categories require prepended category prefixes.

| Hash Path | Page View | Category Context | Description |
| :--- | :--- | :--- | :--- |
| `#/` | `home` | `food` | Global default portal page |
| `#/food` | `home` | `food` | Food additive main page |
| `#/cosmetics` | `home` | `cosmetics` | Cosmetics main page |
| `#/food/search?q=...` | `search` | `food` | Search result for food additives |
| `#/cosmetics/search?q=...`| `search` | `cosmetics` | Search result for cosmetic ingredients |
| `#/food/ingredient/:id` | `detail` | `food` | Deep details of food additive |
| `#/cosmetics/ingredient/:id`| `detail` | `cosmetics` | Deep details of cosmetic ingredient |
| `#/food/analyze?text=...` | `analyze` | `food` | Ingredient text table analysis (food) |
| `#/cosmetics/analyze?text=...`| `analyze`| `cosmetics` | Ingredient text table analysis (cosmetic)|
| `#/food/favorites` | `favorites`| `food` | Favorites tab (isolated for foods) |
| `#/cosmetics/favorites` | `favorites`| `cosmetics` | Favorites tab (isolated for cosmetics)|
| `#/settings` | `settings` | (Shared) | Allergy file & User configuration page |

### 5.2 Resolution Rules (`resolveRoute`)
The routing router parser (`src/router/router.js`) resolves paths as follows:
*   Identifies path and query parameters by splitting at `?`.
*   Decodes category prefix. If none is prepended, routes default to `'food'` (Legacy routes without prefixes default to `'cosmetics'`).
*   Extracts dynamic IDs (e.g., paths starting with `/ingredient/` resolve to the `detail` view with `route.id` equal to the URL suffix).

---

## 6. Core Systems & Business Logic

### 6.1 Allergen Alarm System (过敏原警戒系统)
*   **User Archive Store:** User allergen settings are stored under `compcheck:allergens` inside `localStorage` as a plain string array of allergen IDs (`string[]`). Handled safely using `getUserAllergens()` and `setUserAllergens(ids)` in `src/store/userStore.js`.
*   **Trigger Conditions:** An allergen alert triggers if and only if:
    1.  The queried ingredient's `allergenTypes` list intersects with the user's stored allergen IDs.
    2.  *Fallback Match:* The ingredient's Chinese name (`nameCn`), English name (`nameEn`), or synonym lists (`aliases`) contains any of the Chinese/English names of the user's active allergens.
*   **Visual Alert Outputs:**
    *   **Search Page:** The ingredient card renders a bright-red alert badge: `「含过敏原」`.
    *   **Detail Page:** A major warning banner mounts at the very top of the page: `⚠ 此成分含您关注的过敏原：[AllergenName]`.
    *   **Analyze Page:** Analysis results extract all allergic ingredients and display them inside an isolated red-highlighted block at the top of the matching list.
    *   **Favorites Page:** Display red warning badges beside all allergic items in the list.

### 6.2 Search Matching Engine
The engine (`src/services/ingredientService.js`) calculates a search score (`getSearchScore`) when matching queries:
*   **Score 100:** Query matches perfectly (case-insensitive, normalized) with `nameCn`, `nameEn`, `gbCode`, `eNumber`, or any alias in `aliases`.
*   **Score 70:** Query is a prefix of any name/code/alias.
*   **Score 50:** Query is a substring of any name/code/alias.
*   **Score 20:** Query matches any word within the descriptive `category`, `description`, `riskSummary`, `gbCode`, `eNumber`, or functional arrays.
*   **Result Ordering:** Ordered in descending order of score, falling back to an alphabetical sort on `nameCn` (`zh-Hans-CN` locale).

### 6.3 Ingredient Text Parsing
For bulk ingredient analysis (`src/utils/text.js` and `src/services/ingredientService.js`):
1.  **Normalization:** Replaces full-width punctuation, breaks text at common boundaries (e.g. `，`, `、`, `;`, `\n`).
2.  **Bracket Stripping:** Strips bracket-enclosed descriptive additions, e.g., `"苯氧乙醇(防腐剂)"` cleanly resolves to `"苯氧乙醇"`.
3.  **Loose Name Matching:** Uses partial search checks if names are $\ge 2$ characters in length, allowing for lenient matching of user-provided lists against the database.
4.  **Analysis Report Summary:** Categorizes matches, flags unknown text fragments, and groups highlight risk elements (medium/high hazard levels) ordered by risk rating.

---

## 7. Build, Validation, & Dev Commands

All build and testing actions must use standard scripts pre-registered in `package.json`. Refer to `COMMANDS.md` for specific details.

```bash
# 1. Install Workspace Dependencies
# Check and lock package integrity.
npm install

# 2. Fire Up Local HTTP Dev Server
# Starts server at http://127.0.0.1:5173 (configurable via HOST/PORT env vars).
npm run dev

# 3. Compile Production Output
# Copies static source assets directly to the 'dist/' directory.
npm run build

# 4. Syntactic & Content Compliance Linting
# Scans JavaScript syntax and audits source text for forbidden/unapproved medical terms.
npm run lint

# 5. Core Operational Unit Testing
# Executes Node.js assertions over routing, searching, splitting, storage falling-backs, and allergen rules.
npm run test

# 6. Database Schema Validation
# Asserts structure, dates, and required properties for food additives.
npm run validate:data
```

---

## 8. Development Best Practices & Conventions

### 8.1 Safety & Medical Disclaimers
*   **Tone Constraint:** CompCheck is **not** a clinical diagnostic tool.
*   **Objective Wording:** Avoid absolute, diagnostic, or scaremongering terms.
    *   *Do NOT use:* "绝对有害" (absolutely harmful), "一定致敏" (definitely causes allergy), "治疗疾病" (cures disease), "绝对安全" (completely safe).
    *   *DO use:* "可能需要关注" (may warrant attention), "一般认为刺激性较低" (generally considered low irritation), "部分敏感人群可能不适" (may cause discomfort in sensitive individuals).

### 8.2 Safe Database Storage & Fallbacks
When writing to client state (`src/services/storageService.js`):
*   Do not call `localStorage.setItem` bare without try-catch blocks.
*   In private browsing modes, cookie blockers, or when storage is full (`QuotaExceededError`), the storage wrapper must automatically degrade gracefully to volatile memory cache.

### 8.3 AI & OCR Architecture Ready-Points
To keep frontend files safe and prevent key leaks:
*   API keys must **never** be hardcoded or bundled into the client build.
*   `src/services/aiAnalysisService.js` and `src/services/ocrService.js` are configured to degrade gracefully, displaying a "Service Unavailable / Pre-arranged Proxy Required" prompt when local API keys are omitted. Backend routes must proxy calls to third-party providers.

### 8.4 UI Integrity & Aesthetic Standards
All page renderers (`src/pages/*.js`) must ensure:
*   **Modern Aesthetic:** Clean layouts, consistent spacing, and restrained typography.
*   **Interactive Feedback:** Active states, hovering feedback, and clear response actions.
*   **Robust Views:** Explicit rendering handlers for Loading states, Empty states, and network or resolution Error states.
*   **Mobile-First Design:** Fluid, responsive sizing conforming cleanly without horizontal overflow, tiny buttons, or clipped text.

---

## 9. Forbidden Actions (Strict Rules for Agents)

1.  **No Direct Pushing:** Never attempt to merge code or push directly to `main` or protected branches. All integrations must proceed through normal Pull Request workflows.
2.  **No Code Staging:** Do not run `git add .` or stage modifications unless explicitly instructed to do so by the user.
3.  **No Unrelated Refactoring:** Keep changes highly focused on your target task. Do not touch or modify outside modules, variables, or layouts.
4.  **No Fake Mocking:** Do not hardcode mock data inside pages to mimic completion. Services and data stores must interact realistically.
5.  **No Key Exposures:** Never commit real API keys, passwords, or `.env` files to git history. Check files before final commits.
6.  **No Build Failures:** Never submit a task that fails `npm run lint`, `npm run test`, or `npm run validate:data`.

---

### Mapped Document References
*   Refer to `readme.md` for comprehensive product strategies and regulatory background.
*   Refer to `PROJECT_PLAN.md` to see active milestones, completion scores, and immediate backlogs.
*   Refer to `COMMANDS.md` for specific environment setup details.
*   Refer to `AI_REVIEW.md` to document the outcomes and validation criteria of the current iteration.
