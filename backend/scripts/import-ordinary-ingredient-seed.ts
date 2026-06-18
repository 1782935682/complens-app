import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type pg from 'pg';
import { getConfig } from '../src/config.js';
import { createDatabaseClient } from '../src/db/client.js';
import { assertLocalDatabaseUrl } from './ingredient-knowledge-common.js';

type SeedItem = {
  name: string;
  category: string;
  aliases: string[];
};

const sourceId = 'ordinary-ingredient-seed-s2-v1';
const sourceTitle = 'OCR 基础配料高频词人工整理种子 v1';
const sourceLocalPath = 'backend/scripts/import-ordinary-ingredient-seed.ts';
const sourceUrl = 'local://compcheck/ordinary-ingredient-seed-s2-v1';
const sourceVersion = 'ordinary-ingredient-seed-v1';
const confidenceScore = '0.60';
const repoRoot = process.cwd().endsWith('/backend') ? resolve(process.cwd(), '..') : resolve(process.cwd());
const manualAllergenReviewNames = new Set([
  '小麦', '黑麦', '大麦', '燕麦', '乳', '奶', '鸡蛋', '鸭蛋', '鹌鹑蛋', '蛋',
  '大豆', '黄豆', '花生', '杏仁', '腰果', '榛子', '核桃', '开心果', '坚果',
  '鱼', '虾', '蟹'
].map(normalizeName));

const aliasMap = new Map<string, string[]>([
  ['小麦粉', ['面粉']],
  ['全麦粉', ['全麦小麦粉']],
  ['黑麦', ['裸麦']],
  ['燕麦', ['莜麦']],
  ['斯佩耳特小麦', ['斯佩尔特小麦']],
  ['乳粉', ['奶粉']],
  ['奶酪', ['干酪']],
  ['鸡蛋', ['全蛋']],
  ['蛋白', ['蛋清']],
  ['大豆', ['黄豆']],
  ['大豆蛋白', ['黄豆蛋白']],
  ['花生', ['落花生']],
  ['杏仁', ['扁桃仁']],
  ['巴旦木', ['扁桃仁']],
  ['夏威夷果', ['澳洲坚果']],
  ['虾', ['海虾']],
  ['蟹', ['螃蟹']],
  ['鱼籽', ['鱼子']],
  ['猪肉', ['猪瘦肉']],
  ['牛肉', ['牛瘦肉']],
  ['白砂糖', ['白糖']],
  ['食盐', ['盐']],
  ['酱油', ['酿造酱油']],
  ['食醋', ['醋']],
  ['马铃薯淀粉', ['土豆淀粉']],
  ['木薯淀粉', ['泰国生粉']],
  ['大蒜', ['蒜']],
  ['姜', ['生姜']]
]);

const ordinarySeedItems = uniqueSeedItems([
  ...group('谷物/杂粮/粉类', [
    '小麦', '小麦粉', '面粉', '高筋小麦粉', '低筋小麦粉', '全麦粉', '小麦胚芽', '小麦麸皮',
    '小麦蛋白粉', '谷朊粉', '黑麦', '黑麦粉', '大麦', '大麦粉', '麦芽', '麦芽粉', '麦芽提取物',
    '燕麦', '燕麦片', '燕麦粉', '斯佩耳特小麦', '青稞', '青稞粉', '荞麦', '荞麦粉', '苦荞麦',
    '苦荞粉', '玉米', '玉米粉', '玉米糁', '玉米片', '玉米淀粉', '大米', '米粉', '糯米',
    '糯米粉', '粳米', '籼米', '黑米', '紫米', '糙米', '小米', '小米粉', '高粱', '高粱粉',
    '薏米', '薏仁', '藜麦', '藜麦粉', '莜麦', '莜麦粉', '粟米', '米糠', '大米蛋白'
  ]),
  ...group('乳及乳制品', [
    '牛奶', '全脂牛奶', '脱脂牛奶', '生牛乳', '复原乳', '乳粉', '全脂乳粉', '脱脂乳粉',
    '调制乳粉', '奶粉', '乳清粉', '乳清蛋白粉', '浓缩乳清蛋白', '乳糖', '酪蛋白',
    '酪蛋白酸钠', '奶油', '稀奶油', '黄油', '无水奶油', '奶酪', '干酪', '再制干酪',
    '酸奶', '发酵乳', '炼乳', '淡炼乳', '甜炼乳', '乳脂肪', '乳清', '乳蛋白', '牛乳蛋白',
    '羊奶', '羊乳粉', '奶酪粉', '乳矿物盐'
  ]),
  ...group('蛋类及蛋制品', [
    '鸡蛋', '蛋黄', '蛋白', '蛋粉', '全蛋粉', '蛋黄粉', '蛋白粉', '液态蛋', '全蛋液',
    '蛋清液', '鸭蛋', '鹌鹑蛋', '咸蛋黄', '皮蛋', '蛋液'
  ]),
  ...group('豆类及豆制品', [
    '大豆', '黄豆', '黑豆', '青豆', '红豆', '赤小豆', '绿豆', '豌豆', '豌豆粉',
    '豌豆蛋白', '蚕豆', '芸豆', '扁豆', '鹰嘴豆', '大豆粉', '黄豆粉', '大豆蛋白',
    '大豆分离蛋白', '大豆组织蛋白', '豆粉', '豆浆粉', '豆乳粉', '豆腐', '豆腐干',
    '腐竹', '豆皮', '豆豉', '豆瓣酱', '纳豆', '黑豆粉', '红豆沙', '绿豆沙', '绿豆粉',
    '豌豆淀粉', '大豆卵磷脂', '豆渣粉', '毛豆', '白芸豆', '腰豆', '小扁豆'
  ]),
  ...group('坚果/籽类', [
    '花生', '花生酱', '花生粉', '花生碎', '花生仁', '杏仁', '杏仁粉', '巴旦木',
    '腰果', '腰果仁', '榛子', '榛子仁', '核桃', '核桃仁', '开心果', '开心果仁',
    '碧根果', '碧根果仁', '夏威夷果', '夏威夷果仁', '松子', '松子仁', '板栗', '栗子',
    '瓜子仁', '葵花籽', '葵花籽仁', '南瓜籽', '芝麻', '白芝麻', '黑芝麻', '芝麻酱',
    '芝麻粉', '奇亚籽', '亚麻籽', '亚麻籽粉', '椰子', '椰蓉', '椰子粉', '莲子',
    '芡实', '腰果酱', '榛子酱', '核桃粉', '坚果', '混合坚果'
  ]),
  ...group('水产及藻类', [
    '鱼', '鱼肉', '鱼粉', '鱼糜', '鱼露', '鱼油', '鱼胶原蛋白', '鱼明胶', '鳕鱼',
    '三文鱼', '金枪鱼', '沙丁鱼', '鲭鱼', '鲈鱼', '鲫鱼', '鲤鱼', '带鱼', '黄花鱼',
    '凤尾鱼', '虾', '虾仁', '虾粉', '虾皮', '虾米', '龙虾', '蟹', '蟹肉', '蟹棒',
    '蟹黄', '贝类', '扇贝', '蛤蜊', '牡蛎', '贻贝', '鱿鱼', '墨鱼', '章鱼', '海参',
    '海带', '紫菜', '裙带菜', '海苔', '虾酱', '鱼子', '鱼籽'
  ]),
  ...group('肉禽及制品', [
    '猪肉', '猪肉粉', '猪油渣', '猪骨汤', '猪肉松', '牛肉', '牛肉粉', '牛肉汤',
    '牛骨汤', '羊肉', '羊肉粉', '鸡肉', '鸡肉粉', '鸡胸肉', '鸡汤', '鸭肉', '鸭肉粉',
    '火腿', '培根', '香肠', '腊肠', '午餐肉', '肉松', '肉粉', '明胶', '胶原蛋白肽',
    '猪皮', '牛骨胶原', '鸡油', '牛油'
  ]),
  ...group('油脂', [
    '植物油', '精炼植物油', '大豆油', '菜籽油', '花生油', '玉米油', '葵花籽油',
    '棕榈油', '棕榈仁油', '椰子油', '橄榄油', '芝麻油', '亚麻籽油', '稻米油',
    '米糠油', '茶籽油', '葡萄籽油', '核桃油', '起酥油', '人造奶油', '猪油', '调和油',
    '食用植物油', '氢化植物油', '部分氢化植物油', '可可脂', '代可可脂', '乳脂'
  ]),
  ...group('糖类/甜味原料', [
    '白砂糖', '绵白糖', '赤砂糖', '红糖', '冰糖', '蔗糖', '葡萄糖', '果糖', '麦芽糖',
    '海藻糖', '低聚果糖', '低聚异麦芽糖', '低聚半乳糖', '麦芽糊精', '葡萄糖浆',
    '果葡糖浆', '果糖糖浆', '玉米糖浆', '麦芽糖浆', '转化糖浆', '蜂蜜', '枫糖浆',
    '焦糖', '黑糖', '糖浆', '糖粉', '糖蜜', '甘蔗汁', '浓缩甘蔗汁', '葡萄糖粉',
    '食用葡萄糖'
  ]),
  ...group('调味料/发酵调味', [
    '食盐', '精制盐', '海盐', '酱油', '生抽', '老抽', '酿造酱油', '食醋', '白醋',
    '米醋', '陈醋', '香醋', '料酒', '黄酒', '味噌', '豆酱', '甜面酱', '辣椒酱',
    '番茄酱', '沙拉酱', '蛋黄酱', '蚝油', '鸡精', '味精', '酵母抽提物', '酵母粉',
    '食用酵母', '水解植物蛋白', '水解大豆蛋白', '高汤', '浓缩鸡汁', '牛肉汁',
    '咖喱酱', '蒜蓉酱', '葱油', '辣椒油', '花椒油', '芥末酱', '酸菜', '泡菜',
    '榨菜'
  ]),
  ...group('淀粉/粉体/膳食纤维', [
    '淀粉', '食用淀粉', '马铃薯淀粉', '木薯淀粉', '红薯淀粉', '小麦淀粉', '大米淀粉',
    '预糊化淀粉', '面包糠', '魔芋粉', '魔芋精粉', '菊粉', '燕麦纤维', '小麦纤维',
    '大豆膳食纤维', '竹纤维', '苹果纤维', '柑橘纤维', '可可粉', '咖啡粉', '茶粉',
    '抹茶粉', '大豆蛋白粉', '豌豆蛋白粉', '面筋', '麸皮'
  ]),
  ...group('香辛料/草本', [
    '辣椒', '辣椒粉', '辣椒片', '花椒', '花椒粉', '胡椒', '黑胡椒', '白胡椒', '孜然',
    '孜然粉', '八角', '桂皮', '肉桂', '丁香', '小茴香', '草果', '香叶', '月桂叶',
    '姜', '生姜', '姜粉', '大蒜', '蒜粉', '洋葱', '洋葱粉', '葱', '香葱', '香菜',
    '芹菜', '芥末', '芥末粉', '罗勒', '迷迭香', '百里香', '牛至', '欧芹', '薄荷',
    '紫苏', '陈皮', '柠檬皮', '柠檬汁', '香茅', '咖喱粉', '五香粉', '十三香',
    '香辛料', '香辛料粉', '山奈', '砂仁', '豆蔻', '白豆蔻', '辣根'
  ]),
  ...group('果蔬/汁浆', [
    '水', '苹果', '苹果汁', '浓缩苹果汁', '香蕉', '草莓', '蓝莓', '蔓越莓', '葡萄',
    '葡萄干', '橙子', '橙汁', '浓缩橙汁', '柠檬', '桃', '黄桃', '芒果', '菠萝',
    '菠萝汁', '椰浆', '椰奶', '番茄', '番茄粉', '土豆', '马铃薯', '红薯', '南瓜',
    '胡萝卜', '胡萝卜粉', '菠菜', '西兰花', '蘑菇', '香菇', '木耳', '银耳'
  ])
]);

async function main() {
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify(summarizeSeed(), null, 2));
    return;
  }

  const config = getConfig();
  assertLocalDatabaseUrl(config.databaseUrl);
  const client = createDatabaseClient(config.databaseUrl);
  try {
    const summary = await importSeed(client.pool);
    await writeReports(client.pool, summary);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.pool.end();
  }
}

async function importSeed(pool: pg.Pool) {
  const seedHash = hashText(JSON.stringify(ordinarySeedItems));
  const beforeOrdinary = await scalar(pool, `select count(*)::int from ingredient_master where ingredient_type = 'ordinary_ingredient'`);
  const beforeRelations = await scalar(pool, `select count(*)::int from ingredient_allergen_relations`);
  await pool.query('begin');
  const inserted: string[] = [];
  const updated: string[] = [];
  let aliasCount = 0;
  let sourceRelationCount = 0;
  try {
    await pool.query(`set local statement_timeout = '120s'`);
    await pool.query(`set local lock_timeout = '10s'`);
    await upsertSeedSource(pool, seedHash);
    for (const item of ordinarySeedItems) {
      const existing = await pool.query(
        `select id from ingredient_master where normalized_name = $1 and ingredient_type = 'ordinary_ingredient'`,
        [normalizeName(item.name)]
      );
      const ingredientId = await upsertIngredient(pool, item);
      if (existing.rowCount === 0) inserted.push(ingredientId);
      else updated.push(ingredientId);
      for (const alias of uniqueStrings([item.name, ...item.aliases])) {
        await upsertAlias(pool, ingredientId, alias, alias === item.name ? 'curated_seed_name' : 'curated_seed_alias');
        aliasCount += 1;
      }
      await upsertCategoryTag(pool, ingredientId, item.category);
      await upsertSourceRelation(pool, ingredientId, item);
      sourceRelationCount += 1;
    }
    const allergenSummary = await upsertAllergenRelations(pool);
    const aliasConflictSummary = await markSeedAliasConflictsCandidateOnly(pool);
    await pool.query('commit');

    const afterOrdinary = await scalar(pool, `select count(*)::int from ingredient_master where ingredient_type = 'ordinary_ingredient'`);
    const afterRelations = await scalar(pool, `select count(*)::int from ingredient_allergen_relations`);
    const ordinarySeedManaged = await scalar(pool, `select count(distinct ingredient_id)::int from ingredient_source_relations where source_id = $1`, [sourceId]);
    return {
      generatedAt: new Date().toISOString(),
      sourceId,
      seedHash,
      seedCount: ordinarySeedItems.length,
      ordinarySeedManaged,
      ordinaryIngredientBefore: beforeOrdinary,
      ordinaryIngredientAfter: afterOrdinary,
      ordinaryIngredientDelta: afterOrdinary - beforeOrdinary,
      insertedIngredients: inserted.length,
      updatedIngredients: updated.length,
      aliasesUpserted: aliasCount,
      sourceRelationsUpserted: sourceRelationCount,
      allergenRelationsBefore: beforeRelations,
      allergenRelationsAfter: afterRelations,
      allergenRelationsDelta: afterRelations - beforeRelations,
      allergenRelationsUpserted: allergenSummary.upserted,
      allergenNeedsManualCheck: allergenSummary.needsManualCheck.length,
      aliasConflictsMarkedCandidateOnly: aliasConflictSummary.updated,
      categories: countBy(ordinarySeedItems, (item) => item.category)
    };
  } catch (error) {
    await pool.query('rollback');
    throw error;
  }
}

async function upsertSeedSource(pool: pg.Pool, seedHash: string) {
  await pool.query(
    `insert into official_sources (
      id, source_tier, source_status, source_org, source_type, standard_no, announcement_no,
      title, source_url, official_page_url, attachment_url, original_source_url, local_file_path,
      publication_date, effective_date, expiry_date, retrieved_at, content_hash, source_version,
      license, parser_version, verification_status, confidence_score, supersedes_source_id,
      superseded_by_source_id, notes, status
    ) values (
      $1,'S2','pending_review','CompCheck 数据整理','curated_ordinary_ingredient_seed',null,null,
      $2,$3,null,null,$3,$4,$5,null,null,$6,$7,$8,
      'internal_project_review_only','ordinary-ingredient-seed-import-v1','pending_manual_review',$9,null,null,
      '人工整理的高频配料 OCR 基础词库；非官方数据，不得作为 S0 或 verified 展示。','active'
    )
    on conflict (id) do update set
      source_tier = 'S2',
      source_status = 'pending_review',
      source_type = 'curated_ordinary_ingredient_seed',
      title = excluded.title,
      source_url = excluded.source_url,
      original_source_url = excluded.original_source_url,
      local_file_path = excluded.local_file_path,
      retrieved_at = excluded.retrieved_at,
      content_hash = excluded.content_hash,
      source_version = excluded.source_version,
      license = excluded.license,
      parser_version = excluded.parser_version,
      verification_status = excluded.verification_status,
      confidence_score = excluded.confidence_score,
      notes = excluded.notes,
      updated_at = now()`,
    [
      sourceId,
      sourceTitle,
      sourceUrl,
      sourceLocalPath,
      new Date().toISOString().slice(0, 10),
      new Date().toISOString(),
      seedHash,
      sourceVersion,
      confidenceScore
    ]
  );
}

async function upsertIngredient(pool: pg.Pool, item: SeedItem) {
  const normalized = normalizeName(item.name);
  const id = `ordinary-s2-${hashText(`${item.category}|${normalized}`).slice(0, 20)}`;
  const result = await pool.query(
    `insert into ingredient_master (
      id, canonical_name, normalized_name, ingredient_type, regulatory_status, description,
      cns_code, ins_code, cas_number, source_status, legacy_ingredient_id, legacy_kind,
      enabled, valid_from, valid_to
    ) values ($1,$2,$3,'ordinary_ingredient','pending_review',$4,null,null,null,'pending_review',null,'ordinary_ingredient_seed_s2',true,null,null)
    on conflict (normalized_name, ingredient_type) do update set
      canonical_name = case when ingredient_master.source_status = 'official' then ingredient_master.canonical_name else excluded.canonical_name end,
      regulatory_status = case when ingredient_master.regulatory_status = 'verified_regulation' then ingredient_master.regulatory_status else 'pending_review' end,
      description = case when ingredient_master.source_status = 'official' then ingredient_master.description else excluded.description end,
      source_status = case when ingredient_master.source_status = 'official' then ingredient_master.source_status else 'pending_review' end,
      updated_at = now()
    returning id`,
    [id, item.name, normalized, `S2 pending_review OCR 基础配料词：${item.category}`]
  );
  return String(result.rows[0].id);
}

async function upsertAlias(pool: pg.Pool, ingredientId: string, alias: string, aliasType: string) {
  const normalized = normalizeName(alias);
  await pool.query(
    `insert into ingredient_aliases (
      id, ingredient_id, alias_name, normalized_alias, alias_type, language, source_id,
      source_status, is_official, confidence_score, alias_confidence, match_policy
    ) values ($1,$2,$3,$4,$5,'zh',$6,'legacy_unverified',false,$7,'medium','normal')
    on conflict (ingredient_id, normalized_alias, alias_type) do update set
      alias_name = excluded.alias_name,
      source_id = excluded.source_id,
      source_status = excluded.source_status,
      is_official = false,
      confidence_score = excluded.confidence_score,
      alias_confidence = case when ingredient_aliases.alias_confidence = 'ambiguous' then 'ambiguous' else excluded.alias_confidence end,
      match_policy = case when ingredient_aliases.match_policy = 'candidate_only' then 'candidate_only' else excluded.match_policy end,
      updated_at = now()`,
    [
      `ordinary-alias-${hashText(`${ingredientId}|${normalized}|${aliasType}`).slice(0, 20)}`,
      ingredientId,
      alias,
      normalized,
      aliasType,
      sourceId,
      confidenceScore
    ]
  );
}

async function upsertCategoryTag(pool: pg.Pool, ingredientId: string, category: string) {
  await pool.query(
    `insert into ingredient_type_tags (ingredient_id, tag, source_id)
     values ($1,$2,$3)
     on conflict (ingredient_id, tag) do nothing`,
    [ingredientId, `ordinary:${category}`, sourceId]
  );
}

async function upsertSourceRelation(pool: pg.Pool, ingredientId: string, item: SeedItem) {
  await pool.query(
    `insert into ingredient_source_relations (
      ingredient_id, source_id, source_location, page_number, table_name, row_reference,
      original_name, evidence_summary, valid_from, valid_to, status
    ) values ($1,$2,$3,null,'ordinary_ingredient_seed_v1',$4,$5,$6,null,null,'pending_review')
    on conflict (ingredient_id, source_id, source_location, original_name) do update set
      row_reference = excluded.row_reference,
      evidence_summary = excluded.evidence_summary,
      status = 'pending_review'`,
    [
      ingredientId,
      sourceId,
      `${sourceLocalPath}#${normalizeName(item.name)}`,
      `ordinary-seed-v1:${item.category}:${item.name}`,
      item.name,
      `S2 人工整理 OCR 高频普通配料词；类别=${item.category}；非官方来源，需人工复核后才能提升。`
    ]
  );
}

async function upsertAllergenRelations(pool: pg.Pool) {
  const skippedAliases = new Set(['蛋白']);
  const allergenAliases = await pool.query(
    `select aa.allergen_category_id, aa.normalized_alias, aa.alias_name, aa.confidence
     from allergen_aliases aa
     where aa.review_status = 'pending_review'
     order by aa.normalized_alias`
  );
  const ingredients = await pool.query(
    `select m.id, m.canonical_name, m.normalized_name, array_remove(array_agg(distinct ia.normalized_alias), null) as aliases
     from ingredient_master m
     left join ingredient_aliases ia on ia.ingredient_id = m.id
      and ia.source_id = $1
      and coalesce(ia.match_policy, 'normal') <> 'candidate_only'
     where m.ingredient_type = 'ordinary_ingredient'
       and exists (
         select 1 from ingredient_source_relations sr
         where sr.ingredient_id = m.id
           and sr.source_id = $1
       )
     group by m.id, m.canonical_name, m.normalized_name
     order by m.canonical_name`,
    [sourceId]
  );

  const aliasLookup = new Map<string, Array<{ categoryId: string; aliasName: string; confidence: string }>>();
  for (const alias of allergenAliases.rows as Array<{ allergen_category_id: string; normalized_alias: string; alias_name: string; confidence: string }>) {
    if (!alias.normalized_alias || skippedAliases.has(alias.normalized_alias)) continue;
    const list = aliasLookup.get(alias.normalized_alias) || [];
    list.push({ categoryId: alias.allergen_category_id, aliasName: alias.alias_name, confidence: alias.confidence });
    aliasLookup.set(alias.normalized_alias, list);
  }

  let upserted = 0;
  const needsManualCheck: Array<{ ingredient: string; reason: string }> = [];
  const pendingRelations: Array<{
    ingredientId: string;
    categoryId: string;
    evidenceSummary: string;
    confidence: string;
  }> = [];
  for (const ingredient of ingredients.rows as Array<{ id: string; canonical_name: string; normalized_name: string; aliases: string[] | null }>) {
    const normalizedAliases = uniqueStrings([ingredient.normalized_name, ...(ingredient.aliases || [])]);
    const matched = new Set<string>();
    for (const normalizedAlias of normalizedAliases) {
      const categoryMatches = aliasLookup.get(normalizedAlias) || [];
      for (const match of categoryMatches) {
        pendingRelations.push({
          ingredientId: ingredient.id,
          categoryId: match.categoryId,
          evidenceSummary: `S2 普通配料 exact normalized match: ingredient "${ingredient.canonical_name}" alias "${normalizedAlias}" = allergen alias "${match.aliasName}". 自动关联仅作候选，需人工复核。`,
          confidence: relationConfidence(normalizedAlias, match.confidence)
        });
        matched.add(match.categoryId);
      }
    }
    if (matched.size === 0 && mayNeedAllergenReview(ingredient.canonical_name)) {
      needsManualCheck.push({
        ingredient: ingredient.canonical_name,
        reason: '名称或类别可能涉及常见致敏物质，但没有 exact normalized allergen_alias 命中，未强行关联。'
      });
    }
  }
  upserted = await upsertAllergenRelationBatch(pool, pendingRelations);

  await writeFile(
    join(repoRoot, 'docs', 'allergen-relation-needs-manual-check.json'),
    `${JSON.stringify(needsManualCheck, null, 2)}\n`
  );
  return { upserted, needsManualCheck };
}

async function upsertAllergenRelationBatch(
  pool: pg.Pool,
  relations: Array<{ ingredientId: string; categoryId: string; evidenceSummary: string; confidence: string }>
) {
  let upserted = 0;
  for (const chunk of chunkArray(relations, 100)) {
    const values: unknown[] = [];
    const placeholders = chunk.map((relation, relationIndex) => {
      const offset = relationIndex * 5;
      values.push(relation.ingredientId, relation.categoryId, sourceId, relation.evidenceSummary, relation.confidence);
      return `($${offset + 1},$${offset + 2},'possible',$${offset + 3},$${offset + 4},$${offset + 5},'pending_review',null,null)`;
    });
    await pool.query(
      `insert into ingredient_allergen_relations (
        ingredient_id, allergen_category_id, relation_type, source_id, evidence_summary,
        confidence, review_status, valid_from, valid_to
      ) values ${placeholders.join(',')}
      on conflict (ingredient_id, allergen_category_id, relation_type) do update set
        source_id = excluded.source_id,
        evidence_summary = excluded.evidence_summary,
        confidence = excluded.confidence,
        review_status = 'pending_review',
        valid_from = null`,
      values
    );
    upserted += chunk.length;
  }
  return upserted;
}

async function markSeedAliasConflictsCandidateOnly(pool: pg.Pool) {
  const result = await pool.query(
    `with conflicts as (
       select normalized_alias
       from ingredient_aliases
       where coalesce(match_policy, 'normal') <> 'candidate_only'
       group by normalized_alias
       having count(distinct ingredient_id) > 1
     )
     update ingredient_aliases ia
     set alias_confidence = 'ambiguous',
         match_policy = 'candidate_only',
         updated_at = now()
     from conflicts c
     where ia.normalized_alias = c.normalized_alias
       and ia.source_id = $1
       and coalesce(ia.match_policy, 'normal') <> 'candidate_only'`,
    [sourceId]
  );
  return { updated: result.rowCount || 0 };
}

async function writeReports(pool: pg.Pool, summary: Awaited<ReturnType<typeof importSeed>>) {
  const docsDir = join(repoRoot, 'docs');
  await mkdir(docsDir, { recursive: true });
  await writeOrdinarySeedReport(docsDir, summary);
  await writeAllergenRelationReport(pool, docsDir, summary);
  await writePendingReviewGovernancePlan(pool, docsDir);
  await writeDataQualityReport(pool, docsDir, summary);
}

async function writeOrdinarySeedReport(docsDir: string, summary: Awaited<ReturnType<typeof importSeed>>) {
  const categoryRows = Object.entries(summary.categories)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, count]) => `| ${category} | ${count} |`);
  const content = `# 普通食品原料基础库导入报告

生成时间：${summary.generatedAt}

## 汇总

| 指标 | 数量 |
|---|---:|
| source_id | ${summary.sourceId} |
| source_tier | S2 |
| review_status | pending_review |
| 种子词条数 | ${summary.seedCount} |
| 当前 S2 种子管理 ordinary_ingredient | ${summary.ordinarySeedManaged} |
| 当前 ordinary_ingredient 总数 | ${summary.ordinaryIngredientAfter} |
| 本次幂等执行新增 ingredient | ${summary.insertedIngredients} |
| 本次幂等执行更新 ingredient | ${summary.updatedIngredients} |
| alias upsert | ${summary.aliasesUpserted} |
| source relation upsert | ${summary.sourceRelationsUpserted} |
| seed SHA-256 | ${summary.seedHash} |

## 类别覆盖

| 类别 | 词条数 |
|---|---:|
${categoryRows.join('\n')}

## 数据边界

- 本轮普通配料为人工整理的 OCR 高频基础词，来源等级为 S2，\`source_status=pending_review\`。
- 未把普通配料伪装为 S0 官方标准数据，也未生成法规结论。
- 该基础库用于后续 OCR 候选匹配和人工复核，不进入 verified 查询结论。
`;
  await writeFile(join(docsDir, 'ordinary-ingredient-seed-report.md'), content);
}

async function writeAllergenRelationReport(pool: pg.Pool, docsDir: string, summary: Awaited<ReturnType<typeof importSeed>>) {
  const relations = await pool.query(
    `select
       m.canonical_name as ingredient,
       ac.canonical_name as allergen_category,
       iar.relation_type,
       iar.confidence,
       iar.review_status,
       os.source_tier,
       iar.evidence_summary
     from ingredient_allergen_relations iar
     join ingredient_master m on m.id = iar.ingredient_id
     join allergen_categories ac on ac.id = iar.allergen_category_id
     left join official_sources os on os.id = iar.source_id
     where iar.source_id = $1
     order by ac.canonical_name, m.canonical_name
     limit 300`,
    [sourceId]
  );
  const byCategory = countBy(relations.rows, (row) => String(row.allergen_category));
  const rows = relations.rows.map((row) => `| ${row.ingredient} | ${row.allergen_category} | ${row.relation_type} | ${row.confidence} | ${row.review_status} | ${row.source_tier || ''} | ${String(row.evidence_summary).replace(/\|/g, '/')} |`);
  const content = `# 过敏原关联导入报告

生成时间：${summary.generatedAt}

## 汇总

| 指标 | 数量 |
|---|---:|
| ingredient_allergen_relations 导入前 | ${summary.allergenRelationsBefore} |
| ingredient_allergen_relations 导入后 | ${summary.allergenRelationsAfter} |
| 净新增 relation | ${summary.allergenRelationsDelta} |
| 本脚本 upsert relation | ${summary.allergenRelationsUpserted} |
| 需人工判断但未强行关联 | ${summary.allergenNeedsManualCheck} |

## 按致敏物质类别

| 类别 | relation 数 |
|---|---:|
${Object.entries(byCategory).map(([category, count]) => `| ${category} | ${count} |`).join('\n') || '| 无 | 0 |'}

## 自动 exact-match 关系

| ingredient | allergen_category | relation_type | confidence | review_status | source_tier | evidence |
|---|---|---|---|---|---|---|
${rows.join('\n') || '| 无 | 无 | 无 | 无 | 无 | 无 | 无 |'}

## 规则

- 仅对普通配料名或 S2 别名与 \`allergen_aliases.normalized_alias\` 完全一致的记录建立候选关系。
- \`蛋白\` 因可能指蛋清或泛称蛋白质，自动关联中跳过。
- 所有关联均为 \`pending_review\`，不作为 verified 过敏原结论。
`;
  await writeFile(join(docsDir, 'allergen-relation-report.md'), content);
}

async function writePendingReviewGovernancePlan(pool: pg.Pool, docsDir: string) {
  const grouped = await pool.query(
    `select
       coalesce(os.source_tier, 'unknown') as source_tier,
       m.ingredient_type,
       count(distinct m.id)::int as ingredient_count,
       count(distinct sr.source_id)::int as source_relation_count,
       count(distinct case when coalesce(sr.evidence_summary, '') <> '' then m.id end)::int as evidence_complete_count,
       count(distinct ia.id)::int as alias_count
     from ingredient_master m
     left join ingredient_source_relations sr on sr.ingredient_id = m.id
     left join official_sources os on os.id = sr.source_id
     left join ingredient_aliases ia on ia.ingredient_id = m.id
     where m.regulatory_status = 'pending_review'
        or m.source_status = 'pending_review'
     group by coalesce(os.source_tier, 'unknown'), m.ingredient_type
     order by source_tier, m.ingredient_type`
  );
  const autoCandidates = await pool.query(
    `select distinct m.id, m.canonical_name, m.ingredient_type, os.source_tier, os.source_status, sr.evidence_summary
     from ingredient_master m
     join ingredient_source_relations sr on sr.ingredient_id = m.id
     join official_sources os on os.id = sr.source_id
     where (m.regulatory_status = 'pending_review' or m.source_status = 'pending_review')
       and os.source_tier = 'S0'
       and coalesce(sr.evidence_summary, '') <> ''
       and m.ingredient_type <> 'ordinary_ingredient'
     order by m.ingredient_type, m.canonical_name
     limit 80`
  );
  const manualCandidates = await pool.query(
    `select distinct m.id, m.canonical_name, m.ingredient_type, coalesce(os.source_tier, 'unknown') as source_tier, coalesce(sr.evidence_summary, '') as evidence_summary
     from ingredient_master m
     left join ingredient_source_relations sr on sr.ingredient_id = m.id
     left join official_sources os on os.id = sr.source_id
     where (m.regulatory_status = 'pending_review' or m.source_status = 'pending_review')
       and (os.source_tier in ('S2','S3','S4') or m.ingredient_type = 'ordinary_ingredient')
     order by m.ingredient_type, m.canonical_name
     limit 80`
  );
  const notRecommended = await pool.query(
    `select m.id, m.canonical_name, m.ingredient_type, m.source_status
     from ingredient_master m
     left join ingredient_source_relations sr on sr.ingredient_id = m.id
     where (m.regulatory_status = 'pending_review' or m.source_status = 'pending_review')
       and sr.source_id is null
     order by m.ingredient_type, m.canonical_name
     limit 80`
  );
  const pendingCount = await scalar(pool, `select count(*)::int from ingredient_master where regulatory_status = 'pending_review' or source_status = 'pending_review'`);
  const content = `# pending_review 数据治理计划

生成时间：${new Date().toISOString()}

当前 pending_review ingredient_master 数量：${pendingCount}

## 分组统计

| source_tier | ingredient_type | ingredient_count | source_relation_count | evidence_complete_count | alias_count |
|---|---|---:|---:|---:|---:|
${grouped.rows.map((row) => `| ${row.source_tier} | ${row.ingredient_type} | ${row.ingredient_count} | ${row.source_relation_count} | ${row.evidence_complete_count} | ${row.alias_count} |`).join('\n')}

## 可自动 promoted 候选

说明：这里只是治理建议，不在本轮自动 promoted。建议条件为 S0 来源、source relation 和 evidence 完整、非普通配料。

| ingredient_id | name | type | source_tier | source_status | evidence |
|---|---|---|---|---|---|
${autoCandidates.rows.map((row) => `| ${row.id} | ${row.canonical_name} | ${row.ingredient_type} | ${row.source_tier} | ${row.source_status} | ${String(row.evidence_summary).replace(/\|/g, '/')} |`).join('\n') || '| 无 | 无 | 无 | 无 | 无 | 无 |'}

## 需人工审核

说明：S2 普通配料、非官方补充数据、以及证据足够但还未人工复核的数据保持此类。

| ingredient_id | name | type | source_tier | evidence |
|---|---|---|---|---|
${manualCandidates.rows.map((row) => `| ${row.id} | ${row.canonical_name} | ${row.ingredient_type} | ${row.source_tier} | ${String(row.evidence_summary || '').replace(/\|/g, '/')} |`).join('\n') || '| 无 | 无 | 无 | 无 | 无 |'}

## 不建议使用/不得进入高置信匹配

说明：没有 source relation 或 evidence 的 pending_review 记录不得 promoted；只能作为低置信候选或等待补证。

| ingredient_id | name | type | source_status |
|---|---|---|---|
${notRecommended.rows.map((row) => `| ${row.id} | ${row.canonical_name} | ${row.ingredient_type} | ${row.source_status} |`).join('\n') || '| 无 | 无 | 无 | 无 |'}

## 执行建议

- S0 官方抽取数据：逐条核对原文、页码、表格和适用范围后再 promoted。
- S2 普通配料：先用于 OCR 候选匹配，人工复核来源或企业标签样本后再提高置信度。
- 无 evidence/source relation 记录：补齐来源前不进入高置信自动匹配。
`;
  await writeFile(join(docsDir, 'pending-review-governance-plan.md'), content);
}

async function writeDataQualityReport(pool: pg.Pool, docsDir: string, summary: Awaited<ReturnType<typeof importSeed>>) {
  const stats = await Promise.all([
    scalar(pool, `select count(*)::int from official_sources`),
    scalar(pool, `select count(*)::int from official_sources where source_tier = 'S2'`),
    scalar(pool, `select count(*)::int from ingredient_master where ingredient_type = 'ordinary_ingredient'`),
    scalar(pool, `select count(*)::int from ingredient_master where source_status = 'pending_review' or regulatory_status = 'pending_review'`),
    scalar(pool, `select count(*)::int from ingredient_allergen_relations`),
    scalar(pool, `select count(*)::int from ingredient_allergen_relations where review_status = 'pending_review' and coalesce(evidence_summary, '') <> '' and coalesce(confidence, '') <> ''`),
    scalar(pool, `select count(*)::int from nutrition_claim_rules`),
    scalar(pool, `select count(*)::int from nutrition_polyol_energy_rules`),
    scalar(pool, `select count(*)::int from import_errors`)
  ]);
  const aliasConflicts = await scalar(pool, `
    select count(*)::int
    from (
      select normalized_alias
      from ingredient_aliases
      where coalesce(match_policy, 'normal') <> 'candidate_only'
      group by normalized_alias
      having count(distinct ingredient_id) > 1
    ) t
  `);
  const content = `# 数据质量报告

生成时间：${new Date().toISOString()}

## 本轮数据补齐

| 指标 | 数量 |
|---|---:|
| official_sources | ${stats[0]} |
| S2 来源 | ${stats[1]} |
| ordinary_ingredient | ${stats[2]} |
| S2 seed 管理 ordinary_ingredient | ${summary.ordinarySeedManaged} |
| pending_review ingredient | ${stats[3]} |
| ingredient_allergen_relations | ${stats[4]} |
| allergen relation 证据完整且 pending_review | ${stats[5]} |
| nutrition_claim_rules | ${stats[6]} |
| nutrition_polyol_energy_rules | ${stats[7]} |
| alias conflicts（排除 candidate_only） | ${aliasConflicts} |
| import_errors | ${stats[8]} |

## 质量结论

- 普通配料基础库来自 S2 人工整理种子，全部保持 \`pending_review\`，未标记为 S0 或 verified。
- 过敏原关系仅来自 ordinary ingredient/alias 与 allergen_alias 的 exact normalized match，全部有 evidence、confidence 和 review_status。
- GB 28050-2025 糖醇能量规则仍未在已保存官方 PDF/HTML/问答中定位官方原文，未导入。
- \`npm --prefix backend run db:migrate\` 已能重复执行并返回成功；Drizzle 迁移记录位于 \`drizzle.__drizzle_migrations\`。
- 当前 \`import_errors\` 为 ${stats[8]}。

## 待复核重点

- S2 普通配料需要后续用企业一手标签、商品数字标签或其他可靠来源补证。
- 表 C.1 营养含量声称已保留官方 raw_text，但 PDF 文本层存在拆行，阈值需人工复核后才能 promoted。
- 与过敏原相关但未 exact match 的普通配料已列入 \`docs/allergen-relation-needs-manual-check.json\`。
`;
  await writeFile(join(docsDir, 'data-quality-report.md'), content);
}

function group(category: string, names: string[]): SeedItem[] {
  return names.map((name) => ({ name, category, aliases: aliasMap.get(name) || [] }));
}

function uniqueSeedItems(items: SeedItem[]) {
  const byName = new Map<string, SeedItem>();
  for (const item of items) {
    const normalized = normalizeName(item.name);
    if (!byName.has(normalized)) byName.set(normalized, item);
  }
  return [...byName.values()];
}

function summarizeSeed() {
  return {
    sourceId,
    seedCount: ordinarySeedItems.length,
    categories: countBy(ordinarySeedItems, (item) => item.category)
  };
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function mayNeedAllergenReview(name: string) {
  return manualAllergenReviewNames.has(normalizeName(name));
}

function relationConfidence(normalizedAlias: string, sourceConfidence: string) {
  const base = Number.parseFloat(sourceConfidence);
  const adjusted = Number.isFinite(base) ? Math.min(base, 0.78) : 0.72;
  if (normalizedAlias.length <= 1) return Math.min(adjusted, 0.70).toFixed(2);
  return adjusted.toFixed(2);
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function scalar(pool: pg.Pool, sql: string, params: unknown[] = []) {
  const result = await pool.query(sql, params);
  return Number(result.rows[0]?.count || result.rows[0]?.value || 0);
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function normalizeName(value: string) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[（]/gu, '(')
    .replace(/[）]/gu, ')')
    .replace(/\s+/gu, '')
    .replace(/[·•・]/gu, '')
    .replace(/[，、,;；:：]/gu, '');
}

function hashText(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

void main();
