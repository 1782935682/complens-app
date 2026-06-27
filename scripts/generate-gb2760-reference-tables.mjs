import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const defaultPdfPath = resolve('docs/source-materials/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf');
const pdfPath = process.argv[2] ? resolve(process.argv[2]) : defaultPdfPath;
const outputPath = process.argv[3]
  ? resolve(process.argv[3])
  : resolve('backend/src/data/gb2760OfficialReferenceTables.js');

const generatedAt = '2026-06-13';
const extractionTool = 'pdftotext -bbox-layout + pdftocairo -svg (poppler-utils)';
const a2PdfPageStart = 149;
const a2PdfPageEnd = 150;
const a2TableTitle = '表 A.1 中例外食品编号对应的食品类别';
const b1PdfPage = 152;
const b1TableTitle = '不得添加食品用香料、香精的食品名单';
const b2TableTitle = '允许使用的食品用天然香料名单';
const b3TableTitle = '允许使用的食品用合成香料名单';
const c1TableTitle = '可在各类食品加工过程中使用,残留量不需限定的加工助剂名单(不含酶制剂)';
const c2TableTitle = '需要规定功能和使用范围的加工助剂名单(不含酶制剂)';
const c3TableTitle = '食品用酶制剂及其来源名单';
const dTableTitle = '食品添加剂功能类别';
const e1TableTitle = '食品分类系统';
const fIndexTableTitle = '附录 A 中食品添加剂使用规定索引';
const tableGridHorizontalBoundsCache = new Map();
const latinSpacingTerms = new Set(`
absolute acetate acid acids acetic acetone activated alcohol alkyl amylase amylase amyloliquefaciens ammonium and ananas anise artificial
arabic aspergillus attapulgite bacillus bark barley basil bean beeswax bentonite beta bifidobacterium bitartrate
bud buds butane butanol calcium candida carbon carbonate carboxylase cardamom carica carnauba carrageenan cellulose
chitin chitosan chrysanthemum citric clay clove coenzyme coli common complex concrete copper cytophaga
deacetylated decarboxylase decyl diatomaceous diammonium dihydrogen dimethyl disodium dioxide earth
edible emersonii enzyme escherichia ester esters ethanol ether ethyl eugenia exchange extract extraction fatty fennel ferrous fijiensis flower fluorescens
flowers formate fruit fruits galactosidase garlic gelatin geobacillus gluconase glutaraldehyde glycerate glycerides glycerine
glycerol glycol gum hawthorn heavy hemicellulase higher hog hook humicola husk hydrogen hydrochloric hydroxide illicium insolens insoluble
ion isopropyl jasmine jasmin kaolin kawachii kluyveromyces lactic lactase laurate lauric leaf leaves lichenifor-mis licheniformis
light lime linn magnesium malic malted manganese mannitol menthol methylate mineral mono monolaurate monopalmitate monostearate morifolium
niger nickel nitrogen nitrous octenyl octyl of oil oils orange orthophosphate oxide paraffin patchouli pearl penicillium pentahydrate pentaerythritol
peroxide petroleum phosphate phosphoinositide phospholipase phospholipid phosphoric pinophilus polyacrylamide polydimethylsiloxane polyoxyethylene
polyoxypropylene polyglycerol polypyrrolidone polyphosphate potassium propanediol propane propionate propionic propylene pullulanibacil-lus
pusillus pseudomonas resin resins rhizomucor rhizopus rice rosin seed seeds silicate silica silicon siloxane sodium solvent sorbitan
chloride metabisulphite source or pancreas rock sp spp starch star stearate streptomyces subtilis succinate sucrose sulfate sulfide sulphate sulphite sulfur sulphate sulfuric
tagetes talc tannin tincture tricalcium trichoderma trisodium trisilicate tubingensis var vegetable verum vitamin wheat white wood xanthomonas
zinc zhou
abies absinthium acacia acer aglaia alba album algin algues alfalfa almond aloe althea ambergris american amyris
angelica angostura annatto apricot asafoetida balsam bean benzoin bergamot birch bitter bitterless black bois boronia broad buchu
cajeput camphor capsicum caraway cardamom carob carrot cascara cascarilla cassia castor castoreum cedar celery chamomile cherry chicory china chives cinnamon citronella
clary clover cocoa coffee cognac coriander cornmint costus cubeb cumin daidai damiana dandelion dill elder elemi estragon eucalyptus fennel fenugreek fir fluid
fusel galangal gardenia geranium ghatti ginger grapefruit green guaiac guarana hickory hop hops horehound horseradish hyssop immortelle jambu juniper kernel labdanum
lavandin lavender leek lemon lemongrass licorice lime litsea locust longan lovage mace mandarin maple marjoram mate mentha mimosa molasses mountain myrrh nardostachys naringin neroli nutmeg
oak oakmoss oleoresin olibanum onion opoponax orange origanum orris osmanthus palmarosa paprika parsley partially patchouli peach peel pennyroyal pepper peppermint petitgrain
pimento pine powder pummelo quassia red refined resinoid rose rosemary saffron sandalwood santa sarsaparilla savory scotch seed shell shiso snakeroot solid soya soybean
spearmint spike star stevia styrax summer sweet tangerine tea terpene terpeneless terpenes thyme tolu tops tragacanth tree treemoss tuberose turmeric turpentine vanilla valerian
vetiver violet walnut white wild winter wintergreen wormwood xiang yerba ylang yucca
archangelica arvensis balm berry bigarade bush cassie chestnut civet copaiba cubeba cyperus daniellii date de dementholized douchi fleabane galbanum
genet glory grandis grains hip hips hull junos karaya katemfe laurel luohan massoia mohave molle needle osmanthus paradise rebaudiana root roots
sage soyabean tangelo tar toushi vertiver vitex wumei
ambrette blackcurrant cannabifolia chips crimson dahurica davana fengcha fermented fragrans gentian grandiflorum grape herb japonica mustard odorata oregano perilla sambac stem
swallow tamarind expressed
acetate adipic allyl amyl anisyl benzoate benzoic benzyl butyl butyrate butyric carvyl cinnamate cinnamic cinnamyl citronellyl
decanoic decenoic dodecanoic dodecyl ethyl ethylbutyric fumaric fenchyl formic formate furfuryl geranyl heptanoic heptyl
eugenyl hexadecylic hexanoic hexenoic hexenyl hexyl hydroxybenzoic isoamyl isobutyl isobutyrate isobutyric isohexanoic isovaleric
lauryl levulinic linalyl medica methyl methylbenzyl methylbutyric methylcrotonic methylhexanoic methylnonanoic methyloctanoic
methyloenanthic methylvaleric myrtenyl myristic neryl nonoic nonyl octanoic oleic oxobutyric palmitic phenethyl
phenylacetate phenylacetic phenylpropionic phenylpropyl propyl pyroligneous pyruvic rue salicylate salicylic stearic styralyl styrallyl
succinic tetradecanoic tiglic undecanoic undecenoic undecyl valeric
`.trim().split(/\s+/u));
const latinNoSegmentTerms = new Set([
  'ammonia',
  'butane',
  'butanol',
  'carrageenan',
  'cellulose',
  'cyclodextrin',
  'ethanol',
  'ether',
  'gelatin',
  'glycerine',
  'hydrogen',
  'kaolin',
  'nickel',
  'nitrogen',
  'paraffin',
  'polydimethylsiloxane',
  'polyacrylamide',
  'propane',
  'talc'
]);
const latinFlavorTrailingTerms = new Set([
  'absolute',
  'balsam',
  'bark',
  'bean',
  'berry',
  'concrete',
  'extract',
  'flower',
  'fruit',
  'gum',
  'leaf',
  'leaves',
  'oil',
  'oils',
  'oleoresin',
  'peel',
  'resinoid',
  'root',
  'seed',
  'shell',
  'stem',
  'terpenes',
  'tincture',
  'wood'
]);
const latinPhraseCorrections = new Map([
  ['Chinesedate', 'Chinese date'],
  ['carnaubawax', 'carnauba wax'],
  ['insolublepolyvinylpolypyrroli-done', 'insoluble polyvinylpolypyrrolidone'],
  ['Linoleicacid', 'Linoleic acid'],
  ['Rueoil', 'Rue oil'],
  ['Oleicacid', 'Oleic acid'],
  ['Quininehydrochloride', 'Quinine hydrochloride'],
  ['Citrusmedicavar', 'Citrus medica var'],
  ['medicavar', 'medica var'],
  ['Pelargonliumspp', 'Pelargonium spp'],
  ['Zanthoxylumspp', 'Zanthoxylum spp'],
  ['Cinnamomaumspp', 'Cinnamomum spp'],
  ['Pyroligneousacid', 'Pyroligneous acid'],
  ['Pyroligneousacidextract', 'Pyroligneous acid extract'],
  ['Artificialcognacoil', 'Artificial cognac oil'],
  ['rythroandthreo', 'erythro and threo'],
  ['Tannicacid', 'Tannic acid'],
  ['sodiumpropio-nate', 'sodium propionate'],
  ['silicagel', 'silica gel'],
  ['Polyoxypropyleneoxyethylene', 'Polyoxypropylene oxyethylene'],
  ['sorbi-tanmonolaurate', 'sorbitan monolaurate'],
  ['polyoxyethylenepolyoxyprop-yleneamineether', 'polyoxyethylene polyoxypropylene amine ether'],
  ['polyoxyethylenepolyoxyprop-ylene', 'polyoxyethylene polyoxypropylene'],
  ['vitaminBfamily', 'vitamin B family'],
  ['Bfamily', 'B family'],
  ['includingmilkclottingenzymes', 'including milk clotting enzymes'],
  ['Calfstomach', 'Calf stomach'],
  ['Rutagraveolens', 'Ruta graveolens'],
  ['salivaryglandsorforestomachofcalf,kid,orlamb', 'salivary glands or forestomach of calf, kid, or lamb'],
  ['hog,calf,lamb(kid)orpoultrystomach', 'hog, calf, lamb (kid) or poultry stomach'],
  ['calf,kid,orlambabomasum', 'calf, kid, or lamb abomasum'],
  ['bovine,pigorhorseliver', 'bovine, pig or horse liver'],
  ['porcineorbovinepancreas', 'porcine or bovine pancreas'],
  ['hogorbovinepancreas', 'hog or bovine pancreas'],
  ['porcinepancreas', 'porcine pancreas'],
  ['goatgullets', 'goat gullets'],
  ['Bacillusaci-dopullulyticus', 'Bacillus acidopullulyticus'],
  ['Klebsiellaaero-genes', 'Klebsiella aerogenes'],
  ['Pullulanibacil-lusnaganoensis', 'Pullulanibacillus naganoensis']
]);
const latinTokenCorrections = new Map([
  ['Agene', 'A gene'],
  ['Bgene', 'B gene'],
  ['mono-anddiglyceridesoffattyacids', 'mono- and diglycerides of fatty acids'],
  ['polytyrene', 'polystyrene'],
  ['ethylactetate', 'ethylacetate'],
  ['sorbi-tan', 'sorbitan'],
  ['mo-nooleate', 'monooleate'],
  ['polyoxyeth-ylene', 'polyoxyethylene'],
  ['polyoxyprop-ylene', 'polyoxypropylene'],
  ['polypyrroli-done', 'polypyrrolidone'],
  ['phos-phate', 'phosphate'],
  ['propio-nate', 'propionate'],
  ['sinensisor', 'sinensis or'],
  ['sinen-sis', 'sinensis'],
  ['cal-ciumphosphate', 'calciumphosphate'],
  ['amyloliq-uefaciens', 'amyloliquefaciens'],
  ['offici-nale', 'officinale'],
  ['Dendran-themamorifolium', 'Dendranthema morifolium'],
  ['Dendranthemamorifolium', 'Dendranthema morifolium'],
  ['Dendran-themamorifoliumor', 'Dendranthemamorifoliumor'],
  ['Alkalihaloba-cillusclausii', 'Alkalihalobacillus clausii'],
  ['lichenifor-mis', 'licheniformis'],
  ['hogorbovinepan-creas', 'hogorbovinepancreas'],
  ['stearotheilusrmoph', 'stearothermophilus'],
  ['sucrosepolyoxypropylenees-ter', 'sucrose polyoxypropylene ether']
]);
const syntheticFlavorPhraseCorrections = new Map([
  ['Propyleneglycol', 'Propylene glycol'],
  ['Leafalcohol', 'Leaf alcohol'],
  ['Methylbutylacetate', 'Methylbutyl acetate'],
  ['Ethylbutylacetate', 'Ethylbutyl acetate'],
  ['Geranyl2-ethylbutyrate', 'Geranyl 2-ethylbutyrate'],
  ['Allyl2-ethylbutyrate', 'Allyl 2-ethylbutyrate'],
  ['cis-3-Hexenylformate', 'cis-3-Hexenyl formate'],
  ['trans-2-Hexenylpropionate', 'trans-2-Hexenyl propionate'],
  ['Methylbenzylacetate', 'Methylbenzyl acetate'],
  ['3-Octylacetate', '3-Octyl acetate'],
  ['n-Propylisobutyrate', 'n-Propyl isobutyrate'],
  ['sulfoniumchloride', 'sulfonium chloride'],
  ['Ethylhydrocin-namate', 'Ethyl hydrocinnamate'],
  ['Hydrocin-namate', 'Hydrocinnamate'],
  ['Methtylmyristate', 'Methyl myristate']
]);
const syntheticAlcoholPrefixes = [
  'Butyl',
  'Isopropyl',
  'Isobutyl',
  'Amyl',
  'Isoamyl',
  'Hexyl',
  'Heptyl',
  'Octyl',
  'Nonyl',
  'Decyl',
  'Undecyl',
  'Lauryl',
  'Dodecyl',
  'Fenchyl',
  'Leaf',
  'Styralyl',
  'Dimethylbenzyl',
  'Isopropylbenzyl',
  'Trimethylbenzyl',
  'Methylbenzyl',
  'Methylbutyl',
  'Caryophyllene',
  'Perilla',
  'Benzyl',
  'Phenethyl',
  'Phenylpropyl',
  'Anisyl',
  'Cinnamic',
  'Propyl',
  'Furfuryl',
  'Tetrahydrofurfuryl',
  'Propylphenethyl',
  'Hydratropyl',
  'Amylcinnamyl',
  'Vanillyl'
];
const syntheticAcidPrefixes = [
  'Acetic',
  'Propionic',
  'Pyruvic',
  'Butyric',
  'Isobutyric',
  'Methylbutyric',
  'Ethylbutyric',
  'Valeric',
  'Methylvaleric',
  'Isovaleric',
  'Hexanoic',
  'Adipic',
  'Hexenoic',
  'Heptanoic',
  'Octanoic',
  'Nonoic',
  'Decanoic',
  'Dodecanoic',
  'Lauric',
  'Tetradecanoic',
  'Myristic',
  'Hexadecylic',
  'Palmitic',
  'Citric',
  'Benzoic',
  'Phenylacetic',
  'Cinnamic',
  'Fumaric',
  'Levulinic',
  'Oxobutyric',
  'Methylhexanoic',
  'Methyloenanthic',
  'Methyloctanoic',
  'Methylpentanoic',
  'Glutamic',
  'Lactic',
  'Decenoic',
  'Undecanoic',
  'Undecenoic',
  'Phenylpropionic',
  'Methylcrotonic',
  'Formic',
  'Methylnonanoic',
  'Isohexanoic',
  'Aspartic',
  'Anisic',
  'Glycyrrhizic',
  'Geranic',
  'Ethyloctanoic',
  'Butenoic',
  'Aminobutyric',
  'Mercaptopropionic',
  'Allylacetic',
  'Cyclohexanecarboxylic',
  'Benzoylanthranilic',
  'Hydroxybenzoic',
  'Salicylic',
  'Tiglic',
  'Succinic',
  'Stearic'
];
const syntheticEsterPrefixes = [
  'Methyl',
  'Ethyl',
  'Propyl',
  'Isopropyl',
  'Butyl',
  'Isobutyl',
  'Amyl',
  'Isoamyl',
  'Hexyl',
  'Heptyl',
  'Octyl',
  'Nonyl',
  'Benzyl',
  'Phenethyl',
  'Geranyl',
  'Citronellyl',
  'Linalyl',
  'Neryl',
  'Anisyl',
  'Cinnamyl',
  'Furfuryl',
  'Allyl',
  'Myrtenyl',
  'Styrallyl',
  'Carvyl',
  'Eugenyl',
  'Vanillyl',
  'Bornyl',
  'Menthol',
  'Terpinyl',
  'Cresyl',
  'Dihydrocarvyl',
  'Isopulegyl',
  'Isopentyl',
  'Menthyl',
  'Diethyl',
  '3-Hexenyl',
  '1-Octen-3-yl',
  '2-Methylbutyl',
  '3-Phenylpropyl'
];
const syntheticEsterSuffixes = [
  'phenylacetate',
  'acetoacetate',
  'isovalerate',
  'tetradecanoate',
  'methylbutyrate',
  'methylbutanoate',
  'hydroxybutyrate',
  'hydroxyhexanoate',
  'methylvalerate',
  'methylthiopropionate',
  'mercaptopropionate',
  'phenylpropionate',
  'methylpentanoate',
  'phenylglycidate',
  'furanacrylate',
  'undecylenate',
  'undecenoate',
  'decatrienoate',
  'decadienoate',
  'thiofuroate',
  'heptanoate',
  'octanoate',
  'decanoate',
  'dodecanoate',
  'butenoate',
  'hexenoate',
  'nonenoate',
  'pentanoate',
  'propanoate',
  'malonate',
  'succinate',
  'caproate',
  'caprylate',
  'myristate',
  'laurate',
  'sorbate',
  'lactate',
  'tiglate',
  'furoate',
  'glycidate',
  'carbonate',
  'levulinate',
  'fumarate',
  'valerate',
  'acetate',
  'formate',
  'propionate',
  'butyrate',
  'isobutyrate',
  'benzoate',
  'salicylate',
  'cinnamate'
];
const latinGenusPrefixes = [
  'Aeribacillus',
  'Abies',
  'Acacia',
  'Acer',
  'Aframomum',
  'Aglaia',
  'Allium',
  'Alpinia',
  'Althea',
  'Amyris',
  'Anethum',
  'Aniba',
  'Anogeissus',
  'Allium',
  'Alkalihalobacillus',
  'Ananas',
  'Anoxybacillus',
  'Anthemis',
  'Apium',
  'Armoracia',
  'Artemisia',
  'Asarum',
  'Aspergillus',
  'Astragalus',
  'Atractylodes',
  'Bacillus',
  'Barosma',
  'Betula',
  'Bifidobacterium',
  'Bixa',
  'Boswellia',
  'Boronia',
  'Brassica',
  'Bulnesia',
  'Candida',
  'Camellia',
  'Canarium',
  'Capsicum',
  'Carica',
  'Carum',
  'Carya',
  'Castanea',
  'Ceratania',
  'Ceratoina',
  'Ceratonia',
  'Chaetomium',
  'Chrysanthemum',
  'Cichorium',
  'Cinnamomum',
  'Cinchona',
  'Cistus',
  'Citrus',
  'Coffea',
  'Commiphora',
  'Copaifera',
  'Coriandrum',
  'Crataegus',
  'Croton',
  'Crocus',
  'Cryptocarya',
  'Cryphonectria',
  'Cuminum',
  'Cupressus',
  'Curcuma',
  'Cytophaga',
  'Daucus',
  'Decalepis',
  'Dendranthema',
  'Disporotrichum',
  'Elletaria',
  'Elettaria',
  'Endothia',
  'Erigeron',
  'Eriodictyon',
  'Escherichia',
  'Eugenia',
  'Eucalyptus',
  'Euphoria',
  'Evernia',
  'Ferula',
  'Ficus',
  'Foeniculum',
  'Fusarium',
  'Galbaniflua',
  'Galipea',
  'Gaultheria',
  'Gentiana',
  'Geobacillus',
  'Glycyrrhiza',
  'Gardenia',
  'Hansenula',
  'Helichrysum',
  'Hibiscus',
  'Humulus',
  'Humicola',
  'Hyssopus',
  'Ilex',
  'Illicium',
  'Iris',
  'Jasminum',
  'Juglans',
  'Juniperus',
  'Kereocystis',
  'Kluyveromyces',
  'Lactobacillus',
  'Laminaria',
  'Lavandula',
  'Laurus',
  'Levisticum',
  'Limon',
  'Liquidambar',
  'Lippia',
  'Litsea',
  'Majorana',
  'Matricaria',
  'Marrubium',
  'Medicago',
  'Melaleuca',
  'Melissa',
  'Mentha',
  'Malbranchea',
  'Micrococcus',
  'Michelia',
  'Mucor',
  'Murraya',
  'Myristica',
  'Myroxylon',
  'Nardostachys',
  'Ocimum',
  'Origanum',
  'Paullinia',
  'Papiliotrema',
  'Pelargonium',
  'Perilla',
  'Petroselinum',
  'Pimenta',
  'Piper',
  'Picrasma',
  'Penicillium',
  'Pichia',
  'Pinus',
  'Polianthes',
  'Pogostemon',
  'Prunus',
  'Pullulanibacillus',
  'Pseudomonas',
  'Quassia',
  'Quercus',
  'Rabdosia',
  'Rasamsonia',
  'Rhamnus',
  'Rhizomucor',
  'Rhizopus',
  'Ribes',
  'Ricinus',
  'Rosa',
  'Rosemarinus',
  'Ruminococcus',
  'Ruta',
  'Saccharomyces',
  'Salvia',
  'Sambucus',
  'Santalum',
  'Sarcodactylis',
  'Satureja',
  'Saussurea',
  'Schinus',
  'Siraitia',
  'Smilax',
  'Sophora',
  'Spartium',
  'Spilanthes',
  'Sterculia',
  'Streptomyces',
  'Styrax',
  'Tagetes',
  'Tamarindus',
  'Tagetes',
  'Talaromyces',
  'Taraxacum',
  'Thea',
  'Theobroma',
  'Thaumatococcus',
  'Thermomyces',
  'Thermopolyspora',
  'Thuja',
  'Thymus',
  'Torreya',
  'Trigonella',
  'Trichoderma',
  'Turnera',
  'Valeriana',
  'Vanilla',
  'Vetiveria',
  'Vicia',
  'Viola',
  'Viverra',
  'Vitis',
  'Xanthomonas',
  'Zingiber',
  'Ziziphus'
].sort((a, b) => b.length - a.length);
const b1Footnotes = {
  a: {
    text: '较大婴儿和幼儿配方食品中可以使用香兰素、乙基香兰素和香荚兰豆浸膏(提取物),最大使用量分别为5 mg/100 mL、5 mg/100 mL和按照生产需要适量使用,其中100 mL以即食食品计,生产企业应按照冲调比例折算成配方食品中的使用量;婴幼儿谷类辅助食品中可以使用香兰素,最大使用量为7 mg/100g,其中100g以即食食品计,生产企业应按照冲调比例折算成谷类食品中的使用量;凡使用范围涵盖0~6个月婴幼儿配方食品不得添加任何食用香料。',
    exceptionUses: [
      {
        foodCategoryCode: '13.01.02',
        foodCategoryName: '较大婴儿和幼儿配方食品',
        flavorName: '香兰素',
        maxUseLevel: '5 mg/100 mL',
        useBasis: '100 mL以即食食品计，生产企业应按照冲调比例折算成配方食品中的使用量'
      },
      {
        foodCategoryCode: '13.01.02',
        foodCategoryName: '较大婴儿和幼儿配方食品',
        flavorName: '乙基香兰素',
        maxUseLevel: '5 mg/100 mL',
        useBasis: '100 mL以即食食品计，生产企业应按照冲调比例折算成配方食品中的使用量'
      },
      {
        foodCategoryCode: '13.01.02',
        foodCategoryName: '较大婴儿和幼儿配方食品',
        flavorName: '香荚兰豆浸膏(提取物)',
        maxUseLevel: '按生产需要适量使用',
        useBasis: '100 mL以即食食品计，生产企业应按照冲调比例折算成配方食品中的使用量'
      },
      {
        foodCategoryCode: '13.02.01',
        foodCategoryName: '婴幼儿谷类辅助食品',
        flavorName: '香兰素',
        maxUseLevel: '7 mg/100g',
        useBasis: '100g以即食食品计，生产企业应按照冲调比例折算成谷类食品中的使用量'
      }
    ],
    residualRestriction: '凡使用范围涵盖0~6个月婴幼儿配方食品不得添加任何食用香料'
  }
};

const a2Rows = extractA2Rows();
assertRowCount('Table A.2', a2Rows, 68);
const b1Rows = extractB1Rows();
assertRowCount('Table B.1', b1Rows, 29);
const b2Rows = extractFlavorRows({
  idPrefix: 'gb2760-2024-b2-natural-flavor',
  tableName: '表 B.2',
  tableTitle: b2TableTitle,
  pdfPages: range(153, 168),
  codePattern: /^N\d{3}$/u,
  expectedCount: 388,
  chineseNameMaxX: 245,
  englishNameMinX: 245
});
const b3Rows = extractFlavorRows({
  idPrefix: 'gb2760-2024-b3-synthetic-flavor',
  tableName: '表 B.3',
  tableTitle: b3TableTitle,
  pdfPages: range(168, 225),
  codePattern: /^S\d{4}$/u,
  expectedCount: 1504,
  chineseNameMaxX: 270,
  englishNameMinX: 270
});
const c1Rows = extractCoordinateTableRows({
  idPrefix: 'gb2760-2024-c1-processing-aid-no-residue-limit',
  tableName: '表 C.1',
  tableTitle: c1TableTitle,
  pdfPages: [226, 227],
  expectedCount: 37,
  rowNumberMinX: 60,
  rowNumberMaxX: 90,
  includeLine(line) {
    return (line.pdfPage === 226 && line.mid > 450) || (line.pdfPage === 227 && line.mid < 560);
  },
  buildRowData(row) {
    return {
      processingAidNameCn: extractColumnText(row.lines, 95, 345, { wordPosition: 'center' }),
      processingAidNameEn: extractColumnText(row.lines, 345, 530, { wordPosition: 'center', preserveLatinSpacing: true })
    };
  },
  getRowName(rowData) {
    return rowData.processingAidNameCn;
  },
  getRowCode(row) {
    return String(row.rowNumber);
  },
  getRawSourceText(row, rowData) {
    return formatSourceSentence([
      `GB 2760-2024 表 C.1：序号 ${row.rowNumber}`,
      `助剂中文名称 ${rowData.processingAidNameCn}`,
      `助剂英文名称 ${rowData.processingAidNameEn}`,
      '可在各类食品加工过程中使用,残留量不需限定'
    ]);
  }
});
const c2Rows = extractCoordinateTableRows({
  idPrefix: 'gb2760-2024-c2-processing-aid-function-scope',
  tableName: '表 C.2',
  tableTitle: c2TableTitle,
  pdfPages: range(227, 233),
  expectedCount: 80,
  rowNumberMinX: 60,
  rowNumberMaxX: 90,
  includeLine(line) {
    if (isC2FootnoteLine(line)) return false;
    return (line.pdfPage === 227 && line.mid > 590)
      || (line.pdfPage > 227 && line.pdfPage < 233)
      || (line.pdfPage === 233 && line.mid < 300);
  },
  buildRowData(row) {
    return {
      processingAidNameCn: extractColumnText(row.lines, 90, 185, { wordPosition: 'center' }),
      processingAidNameEn: extractColumnText(row.lines, 185, 310, { wordPosition: 'center', preserveLatinSpacing: true }),
      functionText: extractColumnText(row.lines, 310, 400, { wordPosition: 'center' }),
      useScope: extractColumnText(row.lines, 400, 560, { wordPosition: 'center' })
    };
  },
  getRowName(rowData) {
    return rowData.processingAidNameCn;
  },
  getRowCode(row) {
    return String(row.rowNumber);
  },
  getRawSourceText(row, rowData) {
    return formatSourceSentence([
      `GB 2760-2024 表 C.2：序号 ${row.rowNumber}`,
      `助剂中文名称 ${rowData.processingAidNameCn}`,
      `助剂英文名称 ${rowData.processingAidNameEn}`,
      `功能 ${rowData.functionText}`,
      `使用范围 ${rowData.useScope}`
    ]);
  }
});
const c3Rows = extractCoordinateTableRows({
  idPrefix: 'gb2760-2024-c3-enzyme-preparation',
  tableName: '表 C.3',
  tableTitle: c3TableTitle,
  pdfPages: range(233, 242),
  expectedCount: 66,
  rowNumberMinX: 60,
  rowNumberMaxX: 90,
  mergeDuplicateRowNumbers: true,
  allowNoiseRowStarts: true,
  segmentBoundaryStrategy: 'table_grid',
  includeLine(line) {
    return (line.pdfPage === 233 && line.mid > 330)
      || (line.pdfPage > 233 && line.pdfPage < 242)
      || (line.pdfPage === 242 && line.mid < 620);
  },
  buildRowData(row) {
    return {
      enzymeName: extractColumnText(row.lines, 90, 235, { excludeRowNumber: row.rowNumber, preserveLatinSpacing: true, splitKnownGenera: true }),
      source: extractColumnText(row.lines, 235, 380, { preserveLatinSpacing: true, splitKnownGenera: true }),
      donor: extractColumnText(row.lines, 380, 560, { preserveLatinSpacing: true, splitKnownGenera: true })
    };
  },
  getRowName(rowData) {
    return rowData.enzymeName;
  },
  getRowCode(row) {
    return String(row.rowNumber);
  },
  getRawSourceText(row, rowData) {
    return formatSourceSentence([
      `GB 2760-2024 表 C.3：序号 ${row.rowNumber}`,
      `酶 ${rowData.enzymeName}`,
      `来源 ${rowData.source}`,
      rowData.donor ? `供体 ${rowData.donor}` : ''
    ]);
  }
});
const dRows = extractFunctionCategoryRows();
const e1Rows = extractFoodCategoryRows();
const fRows = extractAdditiveIndexRows();

const fileContent = `import { gb2760OfficialStagingSource } from './gb2760OfficialStaging.js';

export const gb2760OfficialReferenceTableSource = {
  ...gb2760OfficialStagingSource,
  extractionTool: ${JSON.stringify(extractionTool)},
  extractionScope: 'official_reference_tables_structured',
  generatedAt: ${JSON.stringify(generatedAt)}
};

export const gb2760OfficialA2ExceptionFoodCategories = ${JSON.stringify(a2Rows, null, 2)};

export const gb2760OfficialB1NoFlavorFoodCategories = ${JSON.stringify(b1Rows, null, 2)};

export const gb2760OfficialB1Footnotes = ${JSON.stringify(b1Footnotes, null, 2)};

export const gb2760OfficialB2NaturalFlavorRows = ${JSON.stringify(b2Rows, null, 2)};

export const gb2760OfficialB3SyntheticFlavorRows = ${JSON.stringify(b3Rows, null, 2)};

export const gb2760OfficialC1ProcessingAidRows = ${JSON.stringify(c1Rows, null, 2)};

export const gb2760OfficialC2ProcessingAidRows = ${JSON.stringify(c2Rows, null, 2)};

export const gb2760OfficialC3EnzymePreparationRows = ${JSON.stringify(c3Rows, null, 2)};

export const gb2760OfficialDFunctionCategoryRows = ${JSON.stringify(dRows, null, 2)};

export const gb2760OfficialE1FoodCategoryRows = ${JSON.stringify(e1Rows, null, 2)};

export const gb2760OfficialFAdditiveIndexRows = ${JSON.stringify(fRows, null, 2)};

const gb2760OfficialA2ReferenceRows = gb2760OfficialA2ExceptionFoodCategories.map((row) => ({
  ...gb2760OfficialReferenceTableSource,
  id: row.id,
  tableName: '表 A.2',
  tableTitle: ${JSON.stringify(a2TableTitle)},
  rowNumber: row.exceptionNumber,
  rowCode: String(row.exceptionNumber),
  rowName: row.foodCategoryName,
  rowData: {
    exceptionNumber: row.exceptionNumber,
    foodCategoryCode: row.foodCategoryCode,
    foodCategoryName: row.foodCategoryName
  },
  pdfPage: row.pdfPage,
  standardPage: row.standardPage,
  rawSourceText: row.rawSourceText,
  extractionStatus: 'extracted',
  reviewStatus: 'needs_review'
}));

const gb2760OfficialB1ReferenceRows = gb2760OfficialB1NoFlavorFoodCategories.map((row) => {
  const footnote = row.footnoteMarker ? gb2760OfficialB1Footnotes[row.footnoteMarker] : undefined;
  return {
    ...gb2760OfficialReferenceTableSource,
    id: row.id,
    tableName: '表 B.1',
    tableTitle: ${JSON.stringify(b1TableTitle)},
    rowNumber: row.rowNumber,
    rowCode: row.foodCategoryCode,
    rowName: row.foodCategoryName,
    rowData: {
      foodCategoryCode: row.foodCategoryCode,
      foodCategoryName: row.foodCategoryName,
      flavorUseRestriction: footnote ? 'no_added_food_flavor_with_footnote_exceptions' : 'no_added_food_flavor',
      footnoteMarker: row.footnoteMarker,
      ...(footnote ? { footnote } : {})
    },
    pdfPage: row.pdfPage,
    standardPage: row.standardPage,
    rawSourceText: row.rawSourceText,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  };
});

function mapReferenceRows(rows, tableName, tableTitle, getRowData) {
  return rows.map((row) => ({
    ...gb2760OfficialReferenceTableSource,
    id: row.id,
    tableName,
    tableTitle,
    rowNumber: row.rowNumber,
    rowCode: row.rowCode,
    rowName: row.rowName,
    rowData: getRowData(row),
    pdfPage: row.pdfPage,
    standardPage: row.standardPage,
    rawSourceText: row.rawSourceText,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  }));
}

const gb2760OfficialB2ReferenceRows = mapReferenceRows(
  gb2760OfficialB2NaturalFlavorRows,
  '表 B.2',
  ${JSON.stringify(b2TableTitle)},
  (row) => ({
    flavorCode: row.flavorCode,
    flavorNameCn: row.flavorNameCn,
    flavorNameEn: row.flavorNameEn,
    femaNumber: row.femaNumber,
    rawRowText: row.rawRowText
  })
);

const gb2760OfficialB3ReferenceRows = mapReferenceRows(
  gb2760OfficialB3SyntheticFlavorRows,
  '表 B.3',
  ${JSON.stringify(b3TableTitle)},
  (row) => ({
    flavorCode: row.flavorCode,
    flavorNameCn: row.flavorNameCn,
    flavorNameEn: row.flavorNameEn,
    femaNumber: row.femaNumber,
    rawRowText: row.rawRowText
  })
);

const gb2760OfficialC1ReferenceRows = mapReferenceRows(
  gb2760OfficialC1ProcessingAidRows,
  '表 C.1',
  ${JSON.stringify(c1TableTitle)},
  (row) => ({
    processingAidNameCn: row.processingAidNameCn,
    processingAidNameEn: row.processingAidNameEn,
    residueLimitRequirement: 'residue_limit_not_required',
    rawRowText: row.rawRowText
  })
);

const gb2760OfficialC2ReferenceRows = mapReferenceRows(
  gb2760OfficialC2ProcessingAidRows,
  '表 C.2',
  ${JSON.stringify(c2TableTitle)},
  (row) => ({
    processingAidNameCn: row.processingAidNameCn,
    processingAidNameEn: row.processingAidNameEn,
    functionText: row.functionText,
    useScope: row.useScope,
    rawRowText: row.rawRowText
  })
);

const gb2760OfficialC3ReferenceRows = mapReferenceRows(
  gb2760OfficialC3EnzymePreparationRows,
  '表 C.3',
  ${JSON.stringify(c3TableTitle)},
  (row) => ({
    enzymeName: row.enzymeName,
    source: row.source,
    donor: row.donor,
    rawRowText: row.rawRowText
  })
);

const gb2760OfficialDReferenceRows = mapReferenceRows(
  gb2760OfficialDFunctionCategoryRows,
  '附录 D',
  ${JSON.stringify(dTableTitle)},
  (row) => ({
    functionCode: row.functionCode,
    functionCategoryName: row.functionCategoryName,
    definition: row.definition
  })
);

const gb2760OfficialE1ReferenceRows = mapReferenceRows(
  gb2760OfficialE1FoodCategoryRows,
  '表 E.1',
  ${JSON.stringify(e1TableTitle)},
  (row) => ({
    foodCategoryCode: row.foodCategoryCode,
    foodCategoryName: row.foodCategoryName,
    rawRowText: row.rawRowText
  })
);

const gb2760OfficialFReferenceRows = mapReferenceRows(
  gb2760OfficialFAdditiveIndexRows,
  '附录 F',
  ${JSON.stringify(fIndexTableTitle)},
  (row) => ({
    additiveNameCn: row.additiveNameCn,
    insNumber: row.insNumber,
    a1PageNumber: row.a1PageNumber,
    rawRowText: row.rawRowText
  })
);

export const gb2760OfficialReferenceRows = [
  ...gb2760OfficialA2ReferenceRows,
  ...gb2760OfficialB1ReferenceRows,
  ...gb2760OfficialB2ReferenceRows,
  ...gb2760OfficialB3ReferenceRows,
  ...gb2760OfficialC1ReferenceRows,
  ...gb2760OfficialC2ReferenceRows,
  ...gb2760OfficialC3ReferenceRows,
  ...gb2760OfficialDReferenceRows,
  ...gb2760OfficialE1ReferenceRows,
  ...gb2760OfficialFReferenceRows
];

export function getGb2760OfficialReferenceTableSummary() {
  return {
    totalRows: gb2760OfficialReferenceRows.length,
    a2ExceptionFoodCategoryCount: gb2760OfficialA2ExceptionFoodCategories.length,
    b1NoFlavorFoodCategoryCount: gb2760OfficialB1NoFlavorFoodCategories.length,
    b2NaturalFlavorCount: gb2760OfficialB2NaturalFlavorRows.length,
    b3SyntheticFlavorCount: gb2760OfficialB3SyntheticFlavorRows.length,
    c1ProcessingAidCount: gb2760OfficialC1ProcessingAidRows.length,
    c2ProcessingAidCount: gb2760OfficialC2ProcessingAidRows.length,
    c3EnzymePreparationCount: gb2760OfficialC3EnzymePreparationRows.length,
    dFunctionCategoryCount: gb2760OfficialDFunctionCategoryRows.length,
    e1FoodCategoryCount: gb2760OfficialE1FoodCategoryRows.length,
    fAdditiveIndexCount: gb2760OfficialFAdditiveIndexRows.length,
    tableNames: [...new Set(gb2760OfficialReferenceRows.map((row) => row.tableName))],
    tableCounts: countBy(gb2760OfficialReferenceRows, (row) => row.tableName),
    pdfPages: [...new Set(gb2760OfficialReferenceRows.map((row) => row.pdfPage))].sort((a, b) => a - b)
  };
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = String(getKey(item) || 'missing');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b, 'en')));
}
`;

writeFileSync(outputPath, fileContent, 'utf8');
console.log(`Generated ${a2Rows.length + b1Rows.length + b2Rows.length + b3Rows.length + c1Rows.length + c2Rows.length + c3Rows.length + dRows.length + e1Rows.length + fRows.length} GB 2760 reference table rows at ${outputPath}`);

function extractA2Rows() {
  const rows = [];
  for (let pdfPage = a2PdfPageStart; pdfPage <= a2PdfPageEnd; pdfPage += 1) {
    const lines = parsePdfPage(pdfPage);
    const rowStarts = lines
      .flatMap((line) => line.words.map((word) => ({ ...word, mid: line.mid })))
      .filter((word) => word.x < 100 && /^\d{1,2}\.$/u.test(word.text) && word.mid > 140 && word.mid < 780)
      .map((word) => ({ number: Number(word.text.replace('.', '')), mid: word.mid }))
      .sort((a, b) => a.mid - b.mid);

    for (let index = 0; index < rowStarts.length; index += 1) {
      const start = rowStarts[index];
      const next = rowStarts[index + 1];
      const lowerBound = start.mid - 14;
      const upperBound = next ? next.mid - 14 : 770;
      const rowLines = lines.filter((line) => line.mid >= lowerBound && line.mid < upperBound);
      const code = normalizeFoodCategoryCode(joinWords(rowLines.flatMap((line) => (
        line.words.filter((word) => word.x >= 170 && word.x < 260)
      ))));
      const foodCategoryName = cleanText(joinWords(rowLines.flatMap((line) => (
        line.words.filter((word) => word.x >= 270 && word.x < 540)
      ))));

      if (!code || !foodCategoryName) continue;

      const row = {
        id: `gb2760-2024-a2-exception-${String(start.number).padStart(3, '0')}`,
        exceptionNumber: start.number,
        foodCategoryCode: code,
        foodCategoryName,
        pdfPage,
        standardPage: standardPageForPdfPage(pdfPage)
      };
      rows.push({
        ...row,
        rawSourceText: `GB 2760-2024 表 A.2：例外食品类别编号 ${row.exceptionNumber}；食品分类号 ${row.foodCategoryCode}；食品名称 ${row.foodCategoryName}。`
      });
    }
  }
  return rows;
}

function extractB1Rows() {
  const rows = [];
  const lines = parsePdfPage(b1PdfPage);
  const tableLines = lines.filter((line) => line.mid >= 150 && line.mid < 680);

  for (const line of tableLines) {
    const codeWords = line.words.filter((word) => word.x >= 70 && word.x < 130);
    const nameWords = line.words.filter((word) => word.x >= 160 && word.x < 460);
    const code = normalizeFoodCategoryCode(joinWords(codeWords));
    const footnoteMarker = nameWords.some((word) => word.text === 'a' && word.x > 220) ? 'a' : '';
    const foodCategoryName = cleanText(joinWords(nameWords.filter((word) => !(word.text === 'a' && word.x > 220))));

    if (!/^\d{2}(?:\.\d{2})*$/u.test(code) || !foodCategoryName) continue;

    const row = {
      id: `gb2760-2024-b1-no-flavor-${String(rows.length + 1).padStart(3, '0')}`,
      rowNumber: rows.length + 1,
      foodCategoryCode: code,
      foodCategoryName,
      footnoteMarker,
      pdfPage: b1PdfPage,
      standardPage: standardPageForPdfPage(b1PdfPage)
    };
    rows.push({
      ...row,
      rawSourceText: formatSourceSentence([
        `GB 2760-2024 表 B.1：食品分类号 ${row.foodCategoryCode}`,
        `食品名称 ${row.foodCategoryName}`,
        '不得添加食品用香料、香精',
        row.footnoteMarker ? `脚注 ${row.footnoteMarker}：${b1Footnotes[row.footnoteMarker]?.text || ''}` : ''
      ])
    });
  }

  return rows;
}

function extractFlavorRows({
  idPrefix,
  tableName,
  tableTitle,
  pdfPages,
  codePattern,
  expectedCount,
  chineseNameMaxX,
  englishNameMinX
}) {
  const lines = pdfPages
    .flatMap((pdfPage) => parsePdfPage(pdfPage))
    .filter((line) => !isCommonNoiseLine(line));
  const starts = lines
    .map((line) => {
      const rowNumberWord = line.words.find((word) => /^\d+$/u.test(word.text) && word.x < 95);
      const codeWord = line.words.find((word) => codePattern.test(word.text) && word.x < 135);
      return rowNumberWord && codeWord
        ? {
            line,
            rowNumber: Number(rowNumberWord.text),
            flavorCode: codeWord.text,
            center: line.global
          }
        : undefined;
    })
    .filter(Boolean)
    .sort((a, b) => a.center - b.center);

  assertRowCount(tableName, starts, expectedCount);

  const rows = starts.map((start, index) => {
    const lowerBound = index > 0 ? (starts[index - 1].center + start.center) / 2 : start.center - 30;
    const upperBound = index < starts.length - 1 ? (start.center + starts[index + 1].center) / 2 : start.center + 30;
    const rowLines = lines.filter((line) => line.global >= lowerBound && line.global < upperBound && !isCommonNoiseLine(line));
    const rowWords = rowLines.flatMap((line) => line.words);
    const flavorNameCn = extractColumnText(rowLines, 135, chineseNameMaxX, {
      excludeValues: [String(start.rowNumber), start.flavorCode]
    });
    const flavorNameEn = extractColumnText(rowLines, englishNameMinX, 455, {
      preserveLatinSpacing: true,
      latinSpacingContext: tableName === '表 B.2' ? 'natural_flavor' : 'synthetic_flavor',
      splitKnownGenera: tableName === '表 B.2'
    });
    const femaNumber = (rowWords.filter((word) => word.x >= 455 && /^(?:\d{4}|—)$/u.test(word.text)).at(-1) || {}).text || '';
    const pdfPagesForRow = uniqueSorted(rowLines.map((line) => line.pdfPage));
    const pdfPage = pdfPagesForRow[0] || start.line.pdfPage;
    const row = normalizeFlavorRowData(tableName, {
      id: `${idPrefix}-${String(start.rowNumber).padStart(4, '0')}`,
      rowNumber: start.rowNumber,
      rowCode: start.flavorCode,
      flavorCode: start.flavorCode,
      flavorNameCn,
      flavorNameEn,
      femaNumber,
      pdfPage,
      standardPage: standardPageForPdfPage(pdfPage),
      pdfPages: pdfPagesForRow,
      rawRowText: joinWords(rowWords)
    });
    return {
      ...row,
      rowName: row.flavorNameCn,
      rawSourceText: formatSourceSentence([
        `GB 2760-2024 ${tableName}：序号 ${row.rowNumber}`,
        `编码 ${row.flavorCode}`,
        `香料中文名称 ${row.flavorNameCn}`,
        `香料英文名称 ${row.flavorNameEn}`,
        `FEMA 编号 ${row.femaNumber}`
      ])
    };
  });

  assertSequentialRows(tableName, rows);
  return rows;
}

function normalizeFlavorRowData(tableName, row) {
  if (tableName === '表 B.2' && row.flavorCode === 'N060') {
    return {
      ...row,
      flavorNameCn: '杭白菊花浸膏(又名杭菊花流浸膏)',
      flavorNameEn: 'Chrysanthemum Hang Zhou flower extract (Dendranthema morifolium or Chrysanthemum morifolium)'
    };
  }
  return row;
}

function extractCoordinateTableRows({
  idPrefix,
  tableName,
  tableTitle,
  pdfPages,
  expectedCount,
  rowNumberMinX,
  rowNumberMaxX,
  includeLine,
  mergeDuplicateRowNumbers = false,
  allowNoiseRowStarts = false,
  segmentBoundaryStrategy = 'midpoint',
  buildRowData,
  getRowName,
  getRowCode,
  getRawSourceText
}) {
  const lines = pdfPages
    .flatMap((pdfPage) => parsePdfPage(pdfPage))
    .filter((line) => includeLine(line));
  const starts = lines
    .map((line) => {
      if (!allowNoiseRowStarts && isCommonNoiseLine(line)) return undefined;
      const rowNumber = extractRowStartNumber(line, rowNumberMinX, rowNumberMaxX, expectedCount);
      if (!rowNumber) return undefined;
      return {
        line,
        rowNumber,
        center: line.global
      };
    })
    .filter((start) => start && start.rowNumber >= 1 && start.rowNumber <= expectedCount)
    .sort((a, b) => a.center - b.center);

  const segmentRows = segmentBoundaryStrategy === 'table_grid'
    ? buildTableGridSegmentRows(lines, starts, pdfPages)
    : starts.map((start, index) => {
        const previousStart = starts[index - 1];
        const nextStart = starts[index + 1];
        const lowerBound = previousStart
          ? getSegmentBoundary(lines, previousStart.center, start.center, segmentBoundaryStrategy)
          : start.center - 30;
        const upperBound = nextStart
          ? getSegmentBoundary(lines, start.center, nextStart.center, segmentBoundaryStrategy)
          : start.center + 30;
        return {
          rowNumber: start.rowNumber,
          lines: lines.filter((line) => line.global >= lowerBound && line.global < upperBound && !isCommonNoiseLine(line))
        };
      });

  const groupedRows = mergeDuplicateRowNumbers
    ? mergeAdjacentDuplicateRows(segmentRows)
    : segmentRows;

  assertRowCount(tableName, groupedRows, expectedCount);

  const rows = groupedRows.map((row) => {
    const rowData = normalizeCoordinateRowData(tableName, row, buildRowData(row));
    const rowName = getRowName(rowData);
    const rowCode = getRowCode(row, rowData);
    const rowWords = row.lines.flatMap((line) => line.words);
    const pdfPagesForRow = uniqueSorted(row.lines.map((line) => line.pdfPage));
    const pdfPage = pdfPagesForRow[0];
    return {
      id: `${idPrefix}-${String(row.rowNumber).padStart(3, '0')}`,
      rowNumber: row.rowNumber,
      rowCode,
      rowName,
      ...rowData,
      pdfPage,
      standardPage: standardPageForPdfPage(pdfPage),
      pdfPages: pdfPagesForRow,
      rawRowText: normalizeCoordinateRawRowText(tableName, row, joinWords(rowWords)),
      rawSourceText: getRawSourceText(row, rowData)
    };
  });

  assertSequentialRows(tableName, rows);
  for (const row of rows) {
    if (!row.rowName) throw new Error(`${tableName} row ${row.rowNumber} has no rowName`);
    if (!row.rawSourceText.includes(`GB 2760-2024 ${tableName}`)) {
      throw new Error(`${tableName} row ${row.rowNumber} rawSourceText must cite ${tableName}`);
    }
  }
  return rows;
}

function normalizeCoordinateRawRowText(tableName, row, rawRowText) {
  if (tableName === '表 C.2' && row.rowNumber === 33) {
    return '聚氧丙烯氧化乙烯Polyoxypropyleneoxyethylene33消泡剂发酵工艺甘油醚glycerolether(GPE)';
  }
  return rawRowText;
}

function buildTableGridSegmentRows(lines, starts, pdfPages) {
  const sortedPages = [...pdfPages].sort((a, b) => a - b);
  const boundsByPage = new Map(sortedPages.map((pdfPage) => [pdfPage, getTableGridHorizontalBounds(pdfPage)]));

  const getContentTop = (pdfPage) => {
    const bounds = boundsByPage.get(pdfPage) || [];
    return bounds[1] ?? bounds[0] ?? 0;
  };
  const getContentBottom = (pdfPage) => {
    const bounds = boundsByPage.get(pdfPage) || [];
    return bounds.at(-1) ?? 1000;
  };
  const getRowLowerBound = (start) => {
    const bounds = boundsByPage.get(start.line.pdfPage) || [];
    return bounds.filter((bound) => bound < start.line.mid - 0.5).at(-1) ?? getContentTop(start.line.pdfPage);
  };

  return starts.map((start, index) => {
    const nextStart = starts[index + 1];
    const startPage = start.line.pdfPage;
    const rowRanges = [];
    const startPageIndex = sortedPages.indexOf(startPage);
    const lowerBound = getRowLowerBound(start);

    if (!nextStart) {
      rowRanges.push({
        pdfPage: startPage,
        lowerBound,
        upperBound: getContentBottom(startPage)
      });
    } else if (nextStart.line.pdfPage === startPage) {
      rowRanges.push({
        pdfPage: startPage,
        lowerBound,
        upperBound: getRowLowerBound(nextStart)
      });
    } else {
      const nextPageIndex = sortedPages.indexOf(nextStart.line.pdfPage);
      rowRanges.push({
        pdfPage: startPage,
        lowerBound,
        upperBound: getContentBottom(startPage)
      });
      for (const pdfPage of sortedPages.slice(startPageIndex + 1, nextPageIndex)) {
        rowRanges.push({
          pdfPage,
          lowerBound: getContentTop(pdfPage),
          upperBound: getContentBottom(pdfPage)
        });
      }
      rowRanges.push({
        pdfPage: nextStart.line.pdfPage,
        lowerBound: getContentTop(nextStart.line.pdfPage),
        upperBound: getRowLowerBound(nextStart)
      });
    }

    return {
      rowNumber: start.rowNumber,
      lines: lines.filter((line) => rowRanges.some((range) => (
        line.pdfPage === range.pdfPage
          && line.mid >= range.lowerBound - 0.5
          && line.mid < range.upperBound - 0.5
          && !isCommonNoiseLine(line)
      )))
    };
  });
}

function normalizeCoordinateRowData(tableName, row, rowData) {
  if (tableName === '表 C.2') return normalizeC2ProcessingAidRowData(row, rowData);
  if (tableName !== '表 C.3') return rowData;

  const normalizedRowData = {
    ...rowData,
    enzymeName: dedupeRepeatedText(rowData.enzymeName),
    source: normalizeC3FieldText(rowData.source),
    donor: normalizeC3FieldText(rowData.donor)
  };

  if (row.rowNumber === 23) {
    return {
      ...normalizedRowData,
      source: '橘青霉 Penicillium citrinum'
    };
  }
  return normalizedRowData;
}

function normalizeC2ProcessingAidRowData(row, rowData) {
  const override = getC2ProcessingAidRowDataOverride(row.rowNumber);
  return override ? { ...rowData, ...override } : rowData;
}

function getC2ProcessingAidRowDataOverride(rowNumber) {
  switch (rowNumber) {
    case 5:
      return { useScope: '发酵工艺' };
    case 6:
      return { useScope: '调制乳、发酵乳和风味发酵乳、稀奶油(淡奶油)及其类似品、干酪、再制干酪、干酪制品及干酪类似品的加工工艺' };
    case 10:
      return { useScope: '焙烤食品加工工艺、膨化食品加工工艺、蜜饯果糕的加工工艺' };
    case 11:
      return { useScope: '薯类的加工工艺、油脂加工工艺、糖果的加工工艺、胶原蛋白肠衣的加工工艺、膨化食品加工工艺、粮食加工工艺(用于防尘)、发酵工艺、豆制品的加工工艺、鲜酵母制品加工工艺(最大使用量为0.1g/kg)' };
    case 12:
      return { useScope: '啤酒、葡萄酒、果酒、黄酒、配制酒的加工工艺和发酵工艺,茶(类)饮料加工工艺' };
    case 20:
      return { useScope: '煎炸油加工工艺,最大使用量为40g/kg' };
    case 21:
      return { useScope: '淀粉糖和淀粉加工工艺、油脂加工工艺、海藻加工工艺、胶原蛋白肠衣加工工艺、乳清粉和乳清蛋白粉的加工工艺' };
    case 25:
      return { useScope: '发酵工艺' };
    case 26:
      return { useScope: '大豆蛋白的加工工艺(仅限大豆分离蛋白、大豆浓缩蛋白),最大使用量为0.03g/kg(以二氧化硫残留量计)' };
    case 27:
      return { useScope: '葡萄酒加工工艺' };
    case 28:
      return { useScope: '啤酒加工工艺' };
    case 29:
      return { useScope: '饮料加工工艺的水处理工艺、制糖工艺和发酵工艺、制盐工艺' };
    case 30:
      return { useScope: '豆制品加工工艺(最大使用量0.3g/kg,以每千克豆类的使用量计,以聚二甲基硅氧烷计),肉制品、啤酒加工工艺(上述加工工艺最大使用量0.2g/kg,以聚二甲基硅氧烷计),焙烤食品工艺(在模具中的最大使用量30mg/dm2,以聚二甲基硅氧烷计),油脂加工及煎炸工艺(最大使用量0.01g/kg,以聚二甲基硅氧烷计),果冻、果汁、浓缩果汁粉、饮料、速溶食品、冰淇淋、果酱、调味品和蔬菜加工工艺(上述加工工艺最大使用量0.05g/kg,以聚二甲基硅氧烷计),发酵工艺(最大使用量0.1g/kg,以聚二甲基硅氧烷计),薯类加工工艺(最大使用量为按生产需要适量使用),畜禽血制品加工工艺(最大使用量为0.2g/kg,以聚二甲基硅氧烷计),酵母加工制品生产加工工艺(最大使用量0.1g/kg,以聚二甲基硅氧烷计),胶原蛋白肠衣加工工艺' };
    case 33:
      return {
        processingAidNameCn: '聚氧丙烯氧化乙烯甘油醚',
        useScope: '发酵工艺'
      };
    case 34:
      return {
        processingAidNameCn: '聚氧乙烯(20)山梨醇酐单月桂酸酯(又名吐温20),聚氧乙烯(20)山梨醇酐单棕榈酸酯(又名吐温40),聚氧乙烯(20)山梨醇酐单硬脂酸酯(又名吐温60),聚氧乙烯(20)山梨醇酐单油酸酯(又名吐温80)',
        useScope: '制糖工艺、发酵工艺、提取工艺、果蔬汁(浆)饮料加工工艺(最大使用量为0.75g/kg)、植物蛋白饮料加工工艺(最大使用量为2.0g/kg)、豆类制品加工工艺(最大使用量为0.05g/kg,最大使用量以每千克豆类的使用量计)'
      };
    case 35:
      return {
        processingAidNameCn: '聚氧乙烯聚氧丙烯胺醚',
        useScope: '发酵工艺'
      };
    case 37:
      return { useScope: '啤酒加工工艺' };
    case 38:
      return { useScope: '啤酒、葡萄酒、果酒、配制酒、黄酒、罐头食品的加工工艺、水处理工艺、制糖工艺及糖处理工艺和发酵工艺' };
    case 67:
      return { useScope: '胶基糖果加工工艺' };
    case 68:
      return { useScope: '水油状脂肪乳化制品(仅限植脂乳)和02.02类以外的脂肪乳化制品,包括混合的和(或)调味的脂肪乳化制品(仅限植脂奶油)的加工工艺、稀奶油(淡奶油)及其类似品的加工工艺' };
    case 69:
      return { useScope: '提取工艺' };
    case 77:
      return { useScope: '制糖工艺、豆制品加工工艺' };
    case 78:
      return { useScope: '啤酒、葡萄酒、果酒和配制酒的加工工艺、发酵工艺,油脂加工工艺,淀粉糖加工工艺' };
    default:
      return undefined;
  }
}

function getSegmentBoundary(lines, lowerCenter, upperCenter, strategy) {
  const midpoint = (lowerCenter + upperCenter) / 2;
  if (strategy !== 'largest_gap') return midpoint;

  const betweenLines = lines
    .filter((line) => line.global > lowerCenter && line.global < upperCenter && !isCommonNoiseLine(line))
    .sort((a, b) => a.global - b.global);
  if (betweenLines.length < 2) return midpoint;

  const largestGap = betweenLines.slice(1).reduce((best, line, index) => {
    const previousLine = betweenLines[index];
    const gap = line.global - previousLine.global;
    return gap > best.gap ? { gap, boundary: (previousLine.global + line.global) / 2 } : best;
  }, { gap: 0, boundary: midpoint });

  return largestGap.gap >= 24 ? largestGap.boundary : midpoint;
}

function getTableGridHorizontalBounds(pdfPage) {
  if (tableGridHorizontalBoundsCache.has(pdfPage)) {
    return tableGridHorizontalBoundsCache.get(pdfPage);
  }

  const svgPath = `/tmp/gb2760-reference-table-${process.pid}-${pdfPage}.svg`;
  const result = spawnSync('pdftocairo', [
    '-f',
    String(pdfPage),
    '-l',
    String(pdfPage),
    '-svg',
    pdfPath,
    svgPath
  ], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });

  try {
    const svg = readFileSync(svgPath, 'utf8');
    const bounds = [...svg.matchAll(/<path\b(?=[^>]*\btransform="matrix\(([^"]+)\)")(?=[^>]*\bd="M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+) ")[^>]*>/g)]
      .map((match) => {
        const matrix = match[1].split(',').map(Number);
        const [x1, y1, x2, y2] = match.slice(2).map(Number);
        const [a, b, c, d, e, f] = matrix;
        const start = {
          x: a * x1 + c * y1 + e,
          y: b * x1 + d * y1 + f
        };
        const end = {
          x: a * x2 + c * y2 + e,
          y: b * x2 + d * y2 + f
        };
        return { start, end };
      })
      .filter((line) => Math.abs(line.start.y - line.end.y) < 0.25)
      .filter((line) => {
        const minX = Math.min(line.start.x, line.end.x);
        const maxX = Math.max(line.start.x, line.end.x);
        return minX < 80 && maxX > 520 && maxX - minX > 430;
      })
      .map((line) => (line.start.y + line.end.y) / 2)
      .sort((a, b) => a - b)
      .reduce((uniqueBounds, bound) => {
        if (!uniqueBounds.some((existingBound) => Math.abs(existingBound - bound) < 0.5)) {
          uniqueBounds.push(bound);
        }
        return uniqueBounds;
      }, []);

    if (bounds.length < 3) {
      if (result.error || result.status !== 0) {
        throw result.error || new Error(result.stderr || `pdftocairo exited with status ${result.status}`);
      }
      throw new Error(`Unable to extract table grid bounds from PDF page ${pdfPage}`);
    }

    tableGridHorizontalBoundsCache.set(pdfPage, bounds);
    return bounds;
  } catch (error) {
    if (result.error || result.status !== 0) {
      throw result.error || new Error(result.stderr || `pdftocairo exited with status ${result.status}`);
    }
    throw error;
  } finally {
    rmSync(svgPath, { force: true });
  }
}

function dedupeRepeatedText(value) {
  const text = String(value || '');
  const words = text.trim().split(/\s+/u);
  if (words.length % 2 === 0) {
    const wordMiddle = words.length / 2;
    const firstWords = words.slice(0, wordMiddle).join(' ');
    if (firstWords === words.slice(wordMiddle).join(' ')) return firstWords;
  }

  if (text.length % 2 !== 0) return text;
  const middle = text.length / 2;
  const firstHalf = text.slice(0, middle);
  return firstHalf === text.slice(middle) ? firstHalf : text;
}

function normalizeC3FieldText(value) {
  return normalizeC3OrganSourcePhrases(stripLeadingContinuationFragment(value))
    .replace(/stearothe(?:ilusrmoph|\s+ilus\s+rmoph)/giu, 'stearothermophilus')
    .replace(/nigervart\.ubingensis/gu, 'niger var. tubingensis')
    .replace(/nigervar\.\s*tubingensis/gu, 'niger var. tubingensis')
    .replace(/nigervar\.awamori/gu, 'niger var. awamori')
    .replace(/vart\.ubingensis/gu, 'var. tubingensis')
    .replace(/niger var\.(?=\S)/gu, 'niger var. ');
}

function normalizeC3OrganSourcePhrases(value) {
  return String(value || '')
    .replace(/salivary\s*glands\s*or\s*forestomach\s*of\s*calf,\s*kid,\s*or\s*lamb/giu, 'salivary glands or forestomach of calf, kid, or lamb')
    .replace(/hog\s*or\s*bovine\s*pan-?\s*creas/giu, 'hog or bovine pancreas')
    .replace(/porcine\s*or\s*bovine\s*pancreas/giu, 'porcine or bovine pancreas')
    .replace(/porcine\s*pancreas/giu, 'porcine pancreas')
    .replace(/goat\s*gullets/giu, 'goat gullets')
    .replace(/bovine,\s*pig\s*or\s*horse\s*liver/giu, 'bovine, pig or horse liver')
    .replace(/calf,\s*kid,\s*or\s*lamb\s*abomasum/giu, 'calf, kid, or lamb abomasum')
    .replace(/or\s*poultry\s*stomach/giu, 'or poultry stomach');
}

function stripLeadingContinuationFragment(value) {
  return String(value || '').replace(/^(?:misstearothermoph|uefaciens|tis|ilus|sisrum)/u, '');
}

function extractRowStartNumber(line, minX, maxX, expectedCount) {
  const digitWords = line.words
    .filter((word) => /^\d+$/u.test(word.text) && word.x >= minX && word.x < maxX)
    .sort((a, b) => a.x - b.x);
  if (digitWords.length === 0) return undefined;

  const firstCluster = [digitWords[0]];
  for (const word of digitWords.slice(1)) {
    const previous = firstCluster.at(-1);
    if (word.x - previous.xMax > 5) break;
    firstCluster.push(word);
  }

  const rowNumber = Number(firstCluster.map((word) => word.text).join(''));
  return rowNumber >= 1 && rowNumber <= expectedCount ? rowNumber : undefined;
}

function mergeAdjacentDuplicateRows(segmentRows) {
  return segmentRows.reduce((rows, row) => {
    const lastRow = rows.at(-1);
    if (lastRow?.rowNumber === row.rowNumber) {
      lastRow.lines.push(...row.lines);
    } else {
      rows.push({ rowNumber: row.rowNumber, lines: [...row.lines] });
    }
    return rows;
  }, []);
}

function extractFunctionCategoryRows() {
  const lines = getLayoutPageText(243).split('\n').map((line) => line.trim()).filter(Boolean);
  const entries = [];
  let current = null;

  for (const line of lines) {
    if (line === 'GB 2760—2024' || line === '附   录   D' || line === '食品添加剂功能类别' || line.startsWith('注:') || /^\d{1,3}$/u.test(line)) {
      continue;
    }
    if (line === 'D.') continue;

    const normalizedLine = line.replace(/^D\.\s*/u, '');
    const startMatch = normalizedLine.match(/^(\d{1,2})\s+(.+)$/u);
    if (startMatch && Number(startMatch[1]) === entries.length + 1) {
      current = {
        functionNumber: Number(startMatch[1]),
        text: startMatch[2]
      };
      entries.push(current);
      continue;
    }
    if (current) current.text += normalizedLine;
  }

  const rows = entries.map((entry) => {
    const match = entry.text.match(/^([^:：]+)[:：](.+)$/u);
    if (!match) throw new Error(`Unable to parse Appendix D function category row ${entry.functionNumber}: ${entry.text}`);
    const functionCategoryName = cleanText(match[1]);
    const definition = cleanText(match[2]);
    return {
      id: `gb2760-2024-d-function-category-${String(entry.functionNumber).padStart(3, '0')}`,
      rowNumber: entry.functionNumber,
      rowCode: `D.${entry.functionNumber}`,
      rowName: functionCategoryName,
      functionCode: `D.${entry.functionNumber}`,
      functionCategoryName,
      definition,
      pdfPage: 243,
      standardPage: standardPageForPdfPage(243),
      rawSourceText: formatSourceSentence([`GB 2760-2024 附录 D：${entry.functionNumber} ${functionCategoryName}：${definition}`])
    };
  });
  assertRowCount('Appendix D', rows, 23);
  assertSequentialRows('Appendix D', rows);
  return rows;
}

function extractFoodCategoryRows() {
  const lines = range(244, 254)
    .flatMap((pdfPage) => parsePdfPage(pdfPage))
    .filter((line) => line.mid >= 240 && line.mid < 770 && !isCommonNoiseLine(line));
  const anchors = lines
    .map((line) => {
      const code = normalizeFoodCategoryCode(joinWords(line.words.filter((word) => word.x < 130)));
      return /^\d{2}\.(?:\d{1,2}\.?)*(?:\d{1,2})?$/u.test(code)
        ? {
            code,
            center: line.global
          }
        : undefined;
    })
    .filter(Boolean)
    .sort((a, b) => a.center - b.center);

  const rows = anchors.map((anchor, index) => {
    const lowerBound = index > 0 ? (anchors[index - 1].center + anchor.center) / 2 : anchor.center - 25;
    const upperBound = index < anchors.length - 1 ? (anchor.center + anchors[index + 1].center) / 2 : anchor.center + 25;
    const rowLines = lines.filter((line) => line.global >= lowerBound && line.global < upperBound && !isCommonNoiseLine(line));
    const foodCategoryName = extractColumnText(rowLines, 150, 560);
    const pdfPagesForRow = uniqueSorted(rowLines.map((line) => line.pdfPage));
    const pdfPage = pdfPagesForRow[0];
    const rowNumber = index + 1;
    return {
      id: `gb2760-2024-e1-food-category-${String(rowNumber).padStart(3, '0')}`,
      rowNumber,
      rowCode: anchor.code,
      rowName: foodCategoryName,
      foodCategoryCode: anchor.code,
      foodCategoryName,
      pdfPage,
      standardPage: standardPageForPdfPage(pdfPage),
      pdfPages: pdfPagesForRow,
      rawRowText: joinWords(rowLines.flatMap((line) => line.words)),
      rawSourceText: `GB 2760-2024 表 E.1：食品分类号 ${anchor.code}；食品类别/名称 ${foodCategoryName}。`
    };
  });

  assertRowCount('Table E.1', rows, 318);
  for (const row of rows) {
    if (!/^\d{2}(?:\.\d{1,2})*$/u.test(row.foodCategoryCode)) {
      throw new Error(`Table E.1 row ${row.rowNumber} has invalid food category code ${row.foodCategoryCode}`);
    }
    if (!row.foodCategoryName) throw new Error(`Table E.1 row ${row.rowNumber} has no food category name`);
  }
  return rows;
}

function extractAdditiveIndexRows() {
  const lines = range(255, 264)
    .flatMap((pdfPage) => parsePdfPage(pdfPage))
    .filter((line) => line.mid > 100 && line.mid < 760 && !isCommonNoiseLine(line));
  const anchors = lines
    .map((line) => {
      const pageNumberWord = line.words.filter((word) => word.x > 460 && /^\d{1,3}$/u.test(word.text)).at(-1);
      return pageNumberWord
        ? {
            a1PageNumber: Number(pageNumberWord.text),
            center: line.global
          }
        : undefined;
    })
    .filter(Boolean)
    .sort((a, b) => a.center - b.center);

  const rows = anchors.map((anchor, index) => {
    const lowerBound = index > 0 ? (anchors[index - 1].center + anchor.center) / 2 : anchor.center - 35;
    const upperBound = index < anchors.length - 1 ? (anchor.center + anchors[index + 1].center) / 2 : anchor.center + 35;
    const rowLines = lines.filter((line) => line.global >= lowerBound && line.global < upperBound && !isCommonNoiseLine(line));
    const additiveNameCn = extractColumnText(rowLines, 55, 350, { wordPosition: 'center' });
    const insNumber = extractColumnText(rowLines, 350, 460, { wordPosition: 'center' }) || '—';
    const pdfPagesForRow = uniqueSorted(rowLines.map((line) => line.pdfPage));
    const pdfPage = pdfPagesForRow[0];
    const rowNumber = index + 1;
    return {
      id: `gb2760-2024-f-additive-index-${String(rowNumber).padStart(3, '0')}`,
      rowNumber,
      rowCode: String(rowNumber),
      rowName: additiveNameCn,
      additiveNameCn,
      insNumber,
      a1PageNumber: anchor.a1PageNumber,
      pdfPage,
      standardPage: standardPageForPdfPage(pdfPage),
      pdfPages: pdfPagesForRow,
      rawRowText: joinWords(rowLines.flatMap((line) => line.words)),
      rawSourceText: `GB 2760-2024 附录 F：食品添加剂中文名称 ${additiveNameCn}；INS 号 ${insNumber}；附录 A 页码 ${anchor.a1PageNumber}。`
    };
  });

  const normalizedRows = normalizeAdditiveIndexRows(rows);

  assertRowCount('Appendix F', normalizedRows, 287);
  for (const row of normalizedRows) {
    if (!row.additiveNameCn) throw new Error(`Appendix F row ${row.rowNumber} has no additiveNameCn`);
    if (!Number.isInteger(row.a1PageNumber) || row.a1PageNumber <= 0) {
      throw new Error(`Appendix F row ${row.rowNumber} has invalid A.1 page number`);
    }
  }
  return normalizedRows;
}

function normalizeAdditiveIndexRows(rows) {
  const normalizedRows = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const nextRow = rows[index + 1];
    if (row.additiveNameCn.includes('双乙酰酒石酸单双甘油酯') && row.additiveNameCn.includes('司盘类') && nextRow?.additiveNameCn.startsWith('60),')) {
      normalizedRows.push(buildAdditiveIndexRow(row, {
        additiveNameCn: '双乙酰酒石酸单双甘油酯(简称“DATEM”)',
        insNumber: '472e',
        a1PageNumber: 104,
        rawRowText: '双乙酰酒石酸单双甘油酯(简称“DATEM”)472e104'
      }));
      normalizedRows.push(buildAdditiveIndexRow(row, {
        additiveNameCn: '司盘类[包括山梨醇酐单月桂酸酯(又名司盘20),山梨醇酐单棕榈酸酯(又名司盘40),山梨醇酐单硬脂酸酯(又名司盘60),山梨醇酐三硬脂酸酯(又名司盘65),山梨醇酐单油酸酯(又名司盘80)]',
        insNumber: '493,495,491,492,494',
        a1PageNumber: 107,
        rawRowText: '司盘类[包括山梨醇酐单月桂酸酯(又名司盘20),山梨醇酐单棕榈酸酯(又名司盘40),山梨醇酐单硬脂酸酯(又名司盘60),山梨醇酐三硬脂酸酯(又名司盘65),山梨醇酐单油酸酯(又名司盘80)]493,495,491,492,494107'
      }));
      normalizedRows.push(buildAdditiveIndexRow(nextRow, {
        additiveNameCn: '松香季戊四醇酯',
        insNumber: '—',
        a1PageNumber: 108,
        rawRowText: '松香季戊四醇酯—108'
      }));
      index += 1;
      continue;
    }
    if (row.additiveNameCn === '磷酸化二淀粉磷酸酯' && row.insNumber.includes('338') && nextRow?.additiveNameCn.includes('磷酸及磷酸盐')) {
      normalizedRows.push(buildAdditiveIndexRow(row, {
        additiveNameCn: '磷酸化二淀粉磷酸酯',
        insNumber: '1413',
        a1PageNumber: 71,
        rawRowText: '磷酸化二淀粉磷酸酯141371'
      }));
      normalizedRows.push(buildAdditiveIndexRow(nextRow, {
        additiveNameCn: '磷酸及磷酸盐[包括磷酸,焦磷酸二氢二钠,焦磷酸钠,磷酸二氢钙,磷酸二氢钾,磷酸氢二铵,磷酸氢二钾,磷酸氢钙,磷酸三钙,磷酸三钾,磷酸三钠,多聚磷酸钠(包括六偏磷酸钠),三聚磷酸钠,磷酸二氢钠,磷酸氢二钠,焦磷酸四钾,焦磷酸一氢三钠,聚偏磷酸钾,酸式焦磷酸钙]',
        insNumber: '338,450(i),450(iii),341(i),340(i),342(ii),340(ii),341(ii),341(iii),340(iii),339(iii),452(i),451(i),339(i),339(ii),450(v),450(ii),452(ii),450(vii)',
        a1PageNumber: 71,
        rawRowText: '磷酸及磷酸盐[包括磷酸,焦磷酸二氢二钠,焦磷酸钠,磷酸二氢钙,磷酸二氢钾,磷酸氢二铵,磷酸氢二钾,磷酸氢钙,磷酸三钙,磷酸三钾,磷酸三钠,多聚磷酸钠(包括六偏磷酸钠),三聚磷酸钠,磷酸二氢钠,磷酸氢二钠,焦磷酸四钾,焦磷酸一氢三钠,聚偏磷酸钾,酸式焦磷酸钙]338,450(i),450(iii),341(i),340(i),342(ii),340(ii),341(ii),341(iii),340(iii),339(iii),452(i),451(i),339(i),339(ii),450(v),450(ii),452(ii),450(vii)71'
      }));
      index += 1;
      continue;
    }
    if (row.additiveNameCn.includes('甜蜜素') && row.additiveNameCn.includes('吐温类') && nextRow?.additiveNameCn.includes('脱氢乙酸及其钠盐')) {
      normalizedRows.push(buildAdditiveIndexRow(row, {
        additiveNameCn: '甜蜜素(又名环己基氨基磺酸钠),环己基氨基磺酸钙',
        insNumber: '952(iv),952(ii)',
        a1PageNumber: 116,
        rawRowText: '甜蜜素(又名环己基氨基磺酸钠),环己基氨基磺酸钙952(iv),952(ii)116'
      }));
      normalizedRows.push(buildAdditiveIndexRow(row, {
        additiveNameCn: '吐温类[聚氧乙烯(20)山梨醇酐单月桂酸酯(又名吐温20),聚氧乙烯(20)山梨醇酐单棕榈酸酯(又名吐温40),聚氧乙烯(20)山梨醇酐单硬脂酸酯(又名吐温60),聚氧乙烯(20)山梨醇酐单油酸酯(又名吐温80)]',
        insNumber: '432,434,435,433',
        a1PageNumber: 117,
        rawRowText: '吐温类[聚氧乙烯(20)山梨醇酐单月桂酸酯(又名吐温20),聚氧乙烯(20)山梨醇酐单棕榈酸酯(又名吐温40),聚氧乙烯(20)山梨醇酐单硬脂酸酯(又名吐温60),聚氧乙烯(20)山梨醇酐单油酸酯(又名吐温80)]432,434,435,433117'
      }));
      normalizedRows.push(buildAdditiveIndexRow(nextRow, {
        additiveNameCn: '脱氢乙酸及其钠盐(包括脱氢乙酸,脱氢乙酸钠)',
        insNumber: '265,266',
        a1PageNumber: 118,
        rawRowText: '脱氢乙酸及其钠盐(包括脱氢乙酸,脱氢乙酸钠)265,266118'
      }));
      index += 1;
      continue;
    }
    normalizedRows.push(row);
  }

  return normalizedRows.map((row, index) => ({
    ...row,
    id: `gb2760-2024-f-additive-index-${String(index + 1).padStart(3, '0')}`,
    rowNumber: index + 1,
    rowCode: String(index + 1)
  }));
}

function buildAdditiveIndexRow(baseRow, overrides) {
  const row = {
    ...baseRow,
    ...overrides,
    rowName: overrides.additiveNameCn
  };
  return {
    ...row,
    rawSourceText: `GB 2760-2024 附录 F：食品添加剂中文名称 ${row.additiveNameCn}；INS 号 ${row.insNumber}；附录 A 页码 ${row.a1PageNumber}。`
  };
}

function parsePdfPage(pdfPage) {
  const result = spawnSync('pdftotext', [
    '-f',
    String(pdfPage),
    '-l',
    String(pdfPage),
    '-bbox-layout',
    pdfPath,
    '-'
  ], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });

  if ((!result.stdout || result.stdout.length === 0) && (result.error || result.status !== 0)) {
    throw result.error || new Error(result.stderr || `pdftotext exited with status ${result.status}`);
  }

  const words = [...result.stdout.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([\s\S]*?)<\/word>/g)]
    .map((match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
      xMax: Number(match[3]),
      yMax: Number(match[4]),
      text: decodeXml(match[5])
    }));

  const lines = [];
  for (const word of words) {
    const mid = (word.y + word.yMax) / 2;
    let line = lines.find((item) => Math.abs(item.mid - mid) < 3.5);
    if (!line) {
      line = { pdfPage, mid, global: pdfPage * 1000 + mid, words: [] };
      lines.push(line);
    }
    word.lineGlobal = line.global;
    line.words.push(word);
  }

  lines.sort((a, b) => a.mid - b.mid);
  for (const line of lines) {
    line.words.sort((a, b) => a.x - b.x);
  }
  return lines;
}

function getLayoutPageText(pdfPage) {
  const result = spawnSync('pdftotext', [
    '-f',
    String(pdfPage),
    '-l',
    String(pdfPage),
    '-layout',
    pdfPath,
    '-'
  ], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });

  if ((!result.stdout || result.stdout.length === 0) && (result.error || result.status !== 0)) {
    throw result.error || new Error(result.stderr || `pdftotext exited with status ${result.status}`);
  }
  return result.stdout;
}

function isCommonNoiseLine(line) {
  const text = joinWords(line.words);
  if (!text || text === 'GB2760—2024') return true;
  if (/^\d{1,3}$/u.test(text) && (line.words.every((word) => word.x < 90) || line.words.every((word) => word.x > 450))) return true;
  return text.includes('序号')
    || text.includes('FEMA编号')
    || text.includes('食品分类号')
    || text.includes('食品添加剂中文名称')
    || text.includes('INS号')
    || text.startsWith('附录')
    || text.startsWith('表B.')
    || text.startsWith('表C.')
    || text.startsWith('表E.')
    || text.includes('允许使用的食品用天然香料名单')
    || text.includes('允许使用的食品用合成香料名单')
    || text.includes('食品用酶制剂及其来源名单')
    || text.includes('食品分类系统')
    || text.startsWith('注1:')
    || text.startsWith('注2:')
    || text.startsWith('注3:')
    || text.startsWith('a用于提取酶制剂')
    || text.startsWith('b为酶制剂')
    || text.startsWith('c包括针尾曲霉');
}

function isC2FootnoteLine(line) {
  const text = joinWords(line.words);
  return /^\d+\)$/u.test(text)
    || text.includes('包括磷酸(湿法)')
    || text.includes('磷酸湿法仅用于');
}

function extractColumnText(lines, minX, maxX, options = {}) {
  const excludeValues = new Set([
    ...(options.excludeValues || []),
    ...(options.excludeRowNumber ? [String(options.excludeRowNumber)] : [])
  ]);
  const getWordPosition = options.wordPosition === 'center'
    ? (word) => (word.x + word.xMax) / 2
    : (word) => word.x;
  const columnWords = lines.flatMap((line) => line.words.filter((word) => (
    getWordPosition(word) >= minX
      && getWordPosition(word) < maxX
      && !excludeValues.has(word.text)
  )));
  const text = options.preserveLatinSpacing
    ? joinWordsPreservingLatinSpacing(columnWords)
    : joinWords(columnWords);
  return options.preserveLatinSpacing ? restoreLatinReferenceSpacing(text, options) : text;
}

function decodeXml(value) {
  const entities = {
    lt: '<',
    gt: '>',
    amp: '&',
    quot: '"',
    apos: "'"
  };
  return String(value).replace(/&(lt|gt|amp|quot|apos);/g, (match, entity) => entities[entity] || match);
}

function joinWords(words) {
  return sortWordsForText(words)
    .map((word) => word.text)
    .join('');
}

function sortWordsForText(words) {
  return words
    .slice()
    .sort((a, b) => (a.lineGlobal ?? a.y) - (b.lineGlobal ?? b.y) || a.x - b.x);
}

function joinWordsPreservingLatinSpacing(words) {
  return sortWordsForText(words).reduce((state, word) => {
    const token = word.text;
    if (!state.text) return { text: token, previousWord: word };
    const previousToken = state.text.match(/\S+$/u)?.[0] || '';
    const separator = shouldSeparateReferenceTokens(previousToken, token, state.previousWord, word)
      ? ' '
      : '';
    return {
      text: `${state.text}${separator}${token}`,
      previousWord: word
    };
  }, { text: '', previousWord: undefined }).text;
}

function shouldSeparateReferenceTokens(previousToken, currentToken, previousWord, currentWord) {
  if (!previousToken || !currentToken) return false;
  if (/^[,.;:)\]}]/u.test(currentToken)) return false;
  if (/[(\[{]$/u.test(previousToken)) return false;
  if (/\d$/u.test(previousToken) && /^\(\d/u.test(currentToken)) return false;
  if (/-$/u.test(previousToken) && /^[A-Za-z0-9]/u.test(currentToken)) return false;
  if (!hasReferenceTokenGap(previousWord, currentWord)) return false;

  const previousHasLatin = /[A-Za-zα-ωΑ-Ω]/u.test(previousToken);
  const currentHasLatin = /[A-Za-zα-ωΑ-Ω]/u.test(currentToken);
  const currentStartsReference = /^[A-Za-z0-9α-ωΑ-Ω([]/u.test(currentToken);
  const previousEndsReference = /[A-Za-z0-9α-ωΑ-Ω.)\]]$/u.test(previousToken);

  if (previousHasLatin && currentStartsReference) return true;
  if (previousEndsReference && currentHasLatin) return true;
  if (/[\u3400-\u9fff]$/u.test(previousToken) && /^[A-Za-zα-ωΑ-Ω]/u.test(currentToken)) return true;
  if (/[A-Za-zα-ωΑ-Ω.)\]]$/u.test(previousToken) && /^[\u3400-\u9fff]/u.test(currentToken)) return true;
  return false;
}

function hasReferenceTokenGap(previousWord, currentWord) {
  if (!previousWord || !currentWord) return false;
  const previousLine = previousWord.lineGlobal ?? previousWord.y;
  const currentLine = currentWord.lineGlobal ?? currentWord.y;
  if (Math.abs(currentLine - previousLine) > 1) return true;
  return currentWord.x - previousWord.xMax > 1.5;
}

function restoreLatinReferenceSpacing(value, options = {}) {
  let text = String(value || '');
  if (!/[A-Za-z]/u.test(text)) return text;

  for (const [from, to] of latinPhraseCorrections) {
    text = replaceCompactLatinPhrase(text, from, to);
  }

  for (const [from, to] of latinTokenCorrections) {
    text = replaceCompactLatinPhrase(text, from, to);
  }

  text = text
    .replace(/([\u3400-\u9fff])([A-Za-zα-ωΑ-Ω])/gu, '$1 $2')
    .replace(/([A-Za-z])([\u3400-\u9fff])/gu, '$1 $2')
    .replace(/([.)])([\u3400-\u9fff])/gu, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bmedicavar\./giu, 'medica var.')
    .replace(/\bspp\.andotherkelps\b/giu, 'spp. and other kelps')
    .replace(/\bAn-gelicasinensis\b/gu, 'Angelica sinensis')
    .replace(/\bber-gamia\b/gu, 'bergamia')
    .replace(/\bdeal-bata\b/gu, 'dealbata')
    .replace(/\b([A-Z]{1,3}|[A-Z][a-z]{2,}|[fF])\.(?=(?:and|or|var|subsp)\b)/gu, '$1. ')
    .replace(/\bspp\.(?=(?:and|or|of)\b)/giu, 'spp. ')
    .replace(/\b(var|subsp)\.(?=[A-Za-z])/giu, '$1. ')
    .replace(/\b([A-Z])\.(?=[a-z]{3,}\b)/gu, '$1. ')
    .replace(/([A-Za-zα-ωΑ-Ω.)\]])\[/gu, (match, previousChar, offset, fullText) => (
      shouldAttachSyntheticSquareBracket(fullText, offset + previousChar.length, options)
        ? `${previousChar}[`
        : `${previousChar} [`
    ))
    .replace(/([A-Za-z])\((?!\d)/g, (match, previousLetter, offset, fullText) => (
      shouldAttachSyntheticParenthetical(fullText, offset + previousLetter.length, undefined, options)
        ? `${previousLetter}(`
        : `${previousLetter} (`
    ))
    .replace(/\.([A-Z][a-z])/g, '. $1')
    .replace(/\)(?=\()/g, ') ')
    .replace(/\)(?=[A-Za-z\u3400-\u9fff])/gu, (match, offset, fullText) => (
      shouldAttachSyntheticParenthetical(fullText, undefined, offset, options) ? ')' : ') '
    ));

  if (options.latinSpacingContext !== 'synthetic_flavor') {
    text = text.replace(/,([^\s,.;:)\]])/g, (match, next, offset, fullText) => (
      /\d/u.test(next)
        && (
          /\d/u.test(fullText[offset - 1] || '')
          || /\(\d+[A-Za-z]?\)$/u.test(fullText.slice(0, offset))
        )
        ? `,${next}`
        : `, ${next}`
    ));
  }

  text = options.latinSpacingContext === 'synthetic_flavor'
    ? restoreSyntheticFlavorSpacing(text)
    : text.replace(/[A-Za-z][A-Za-z-]*/g, (token) => segmentLatinToken(token, options));

  return text
    .replace(/(\d),\s+(?=\d)/g, '$1,')
    .replace(/(\d)\s+\((?=\d)/g, '$1(')
    .replace(/(\(\d+[A-Za-z]?\)),\s+(?=\d)/g, '$1,')
    .replace(/\b(A\d)(?=[A-Z][a-z])/g, '$1 ')
    .replace(/\b(CAG\d+)(?=[A-Z][a-z])/g, '$1 ')
    .replace(/\bsp\.(?=CAG\d+\b)/g, 'sp. ')
    .replace(/\bmedicavar\./giu, 'medica var.')
    .replace(/\bspp\.andotherkelps\b/giu, 'spp. and other kelps')
    .replace(/\bspp\.(?=(?:and|or|of)\b)/giu, 'spp. ')
    .replace(/\bpsicose(?=\d+-epimerase\b)/giu, 'psicose ')
    .replace(/\s+([,.;:)\]])/g, '$1')
    .replace(/([(])\s+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function restoreSyntheticFlavorSpacing(value) {
  let text = String(value || '');
  for (const [from, to] of syntheticFlavorPhraseCorrections) {
    text = replaceCompactLatinPhrase(text, from, to);
  }

  text = replaceSyntheticCompactTerminalWord(text, 'hydrochloride', { minPrefixLength: 3 });
  text = replaceSyntheticCompactTerminalWord(text, 'oxide', { exceptPrefixes: ['per'] });
  text = replaceSyntheticCompactSuffix(text, syntheticAlcoholPrefixes, 'alcohol', { allowSymbolLead: true });
  text = replaceSyntheticCompactSuffix(text, syntheticAcidPrefixes, 'acid', { allowSymbolLead: true });
  text = replaceSyntheticCompactTerminalWord(text, 'acid');
  text = replaceSyntheticEsterPrefixBeforeLocant(text);
  for (const suffix of syntheticEsterSuffixes) {
    text = replaceSyntheticCompactSuffix(text, syntheticEsterPrefixes, suffix, { allowSymbolLead: true, skipLowercasePrefix: true });
    text = replaceSyntheticYlCompactSuffix(text, suffix);
  }

  return restoreSyntheticRingLocantSpacing(text)
    .replace(/\b(acid|hydrochloride|oxide)(?=[α-ωΑ-Ω])/giu, '$1 ');
}

function shouldAttachSyntheticSquareBracket(fullText, bracketIndex, options = {}) {
  if (options.latinSpacingContext !== 'synthetic_flavor') return false;
  const closeIndex = fullText.indexOf(']', bracketIndex + 1);
  if (closeIndex < 0) return false;
  return hasSyntheticRingLocantPrefix(fullText.slice(0, bracketIndex));
}

function restoreSyntheticRingLocantSpacing(value) {
  return String(value)
    .replace(/(\b[A-Za-zα-ωΑ-Ω]*(?:cyclo|spiro|benzo|thieno))\s+\[/giu, '$1[')
    .replace(/(\b[A-Za-zα-ωΑ-Ω]*(?:cyclo|spiro|benzo|thieno)\[[^\]]+\])\s+(?=[A-Za-zα-ωΑ-Ω-])/giu, '$1');
}

function hasSyntheticRingLocantPrefix(value) {
  const before = String(value || '').trimEnd();
  return /(?:\b[A-Za-zα-ωΑ-Ω]*(?:cyclo|spiro|benzo|thieno)|\b[A-Za-zα-ωΑ-Ω]*(?:cyclo|spiro|benzo|thieno)\[[^\]\s]+\])$/iu.test(before);
}

function replaceSyntheticCompactSuffix(value, prefixes, suffix, options = {}) {
  const prefixPattern = prefixes.map(escapeRegExp).join('|');
  const leadingPattern = options.allowSymbolLead ? '(^|[^A-Za-z])' : '(^|[\\s([{])';
  const pattern = new RegExp(`${leadingPattern}(${prefixPattern})(${escapeRegExp(suffix)})(?=$|[^A-Za-z])`, 'giu');
  return String(value).replace(pattern, (match, leading, prefix, matchedSuffix) => {
    if (options.skipLowercasePrefix && leading === '-' && /^[a-z]/u.test(prefix)) return match;
    return `${leading}${prefix} ${matchedSuffix.toLowerCase()}`;
  });
}

function replaceSyntheticCompactTerminalWord(value, terminalWord, options = {}) {
  const wordPattern = escapeRegExp(terminalWord);
  const minPrefixLength = options.minPrefixLength || 4;
  const pattern = new RegExp(`(^|[^A-Za-z])([A-Za-zα-ωΑ-Ω][A-Za-zα-ωΑ-Ω-]{${minPrefixLength - 1},})(${wordPattern})(?=$|[^A-Za-z])`, 'giu');
  const exceptPrefixes = new Set((options.exceptPrefixes || []).map((prefix) => prefix.toLowerCase()));
  return String(value).replace(pattern, (match, leading, prefix, matchedWord) => {
    const lowerPrefix = prefix.toLowerCase();
    if ([...exceptPrefixes].some((exceptPrefix) => lowerPrefix.endsWith(exceptPrefix))) return match;
    return `${leading}${prefix} ${matchedWord.toLowerCase()}`;
  });
}

function replaceSyntheticEsterPrefixBeforeLocant(value) {
  const suffixPattern = syntheticEsterSuffixes.map(escapeRegExp).join('|');
  const pattern = new RegExp(`(^|[^A-Za-z])([A-Za-z0-9][A-Za-z0-9,'.+-]*yl)(?=\\d[A-Za-z0-9,()'.+-]*(?:${suffixPattern})\\b)`, 'giu');
  return String(value).replace(pattern, '$1$2 ');
}

function replaceSyntheticYlCompactSuffix(value, suffix) {
  const pattern = new RegExp(`(^|[^A-Za-z])([A-Za-z0-9][A-Za-z0-9,'.+-]*yl)(${escapeRegExp(suffix)})(?=$|[^A-Za-z])`, 'giu');
  return String(value).replace(pattern, (match, leading, prefix, matchedSuffix) => {
    if (leading === '-' && /^[a-z]+yl$/u.test(prefix)) return match;
    if (/^\d+(?:,\d+)*-[a-z]{3,}yl$/u.test(prefix) && !['acetate', 'formate'].includes(matchedSuffix.toLowerCase())) return match;
    if (prefix.toLowerCase().endsWith('phenyl') && matchedSuffix.toLowerCase() === 'acetate') {
      return match;
    }
    return `${leading}${prefix} ${matchedSuffix.toLowerCase()}`;
  });
}

function shouldAttachSyntheticParenthetical(fullText, openIndex, closeIndex, options = {}) {
  if (options.latinSpacingContext !== 'synthetic_flavor') return false;
  const resolvedOpenIndex = openIndex ?? fullText.lastIndexOf('(', closeIndex - 1);
  const resolvedCloseIndex = closeIndex ?? fullText.indexOf(')', openIndex + 1);
  if (resolvedOpenIndex < 0 || resolvedCloseIndex < 0 || resolvedCloseIndex <= resolvedOpenIndex) return false;

  const beforeOpen = fullText[resolvedOpenIndex - 1] || '';
  const afterClose = fullText[resolvedCloseIndex + 1] || '';
  const content = fullText.slice(resolvedOpenIndex + 1, resolvedCloseIndex);
  return /[-\d]$/u.test(beforeOpen) || (/^[a-z]/u.test(content) && /^[A-Za-z\u3400-\u9fff]/u.test(afterClose));
}

function segmentLatinToken(token, options = {}) {
  const lower = token.toLowerCase();
  const corrected = latinTokenCorrections.get(token) || latinTokenCorrections.get(lower);
  if (corrected && corrected.toLowerCase() !== lower) {
    return preserveLatinTokenCase(token, segmentLatinToken(corrected, options));
  }

  if (token.length < 7 || /^[A-Z]{2,}$/u.test(token)) return token;
  if (/^[A-Z]{1,3}$/u.test(token)) return token;

  if (latinNoSegmentTerms.has(lower)) return token;

  if (options.splitKnownGenera && /^[A-Z]/u.test(token)) {
    const genusSplit = splitKnownLatinGenusToken(token, options);
    if (genusSplit) return genusSplit;
  }

  const prefixed = token.match(/^([A-Z]{1,2}|[a-z]|β)-(.+)$/u);
  if (prefixed) {
    const suffix = segmentLatinToken(prefixed[2], options);
    return `${prefixed[1]}-${suffix}`;
  }

  const parts = segmentLatinCompound(lower);
  if (!parts || parts.length < 2) return token;

  let offset = 0;
  return parts
    .map((part) => {
      const originalPart = token.slice(offset, offset + part.length);
      offset += part.length;
      return originalPart;
    })
    .join(' ');
}

function splitKnownLatinGenusToken(token, options = {}) {
  const lower = token.toLowerCase();
  for (const genus of latinGenusPrefixes) {
    const genusLower = genus.toLowerCase();
    if (!lower.startsWith(genusLower) || lower.length <= genusLower.length) continue;
    const rest = token.slice(genus.length);
    if (!/^[a-z-]/u.test(rest)) continue;
    return `${token.slice(0, genus.length)} ${segmentLatinSpeciesToken(rest)}`;
  }
  return undefined;
}

function segmentLatinSpeciesToken(token) {
  const lower = token.toLowerCase();
  const corrected = latinTokenCorrections.get(token) || latinTokenCorrections.get(lower);
  if (corrected && corrected.toLowerCase() !== lower) {
    return preserveLatinTokenCase(token, segmentLatinSpeciesToken(corrected));
  }
  const trailingParts = splitLatinSpeciesTrailingDescriptor(token);
  if (trailingParts) return trailingParts;
  return token;
}

function splitLatinSpeciesTrailingDescriptor(token) {
  let best;
  for (let index = 3; index <= token.length - 3; index += 1) {
    const suffix = token.slice(index);
    const suffixParts = segmentLatinCompound(suffix.toLowerCase());
    if (!suffixParts || suffixParts.some((part) => !latinFlavorTrailingTerms.has(part))) continue;
    const candidate = { prefix: token.slice(0, index), suffixParts };
    if (!best || candidate.suffixParts.length > best.suffixParts.length || (
      candidate.suffixParts.length === best.suffixParts.length && candidate.prefix.length < best.prefix.length
    )) {
      best = candidate;
    }
  }
  if (!best) return undefined;

  let offset = best.prefix.length;
  const suffix = best.suffixParts.map((part) => {
    const originalPart = token.slice(offset, offset + part.length);
    offset += part.length;
    return originalPart;
  }).join(' ');
  return `${best.prefix} ${suffix}`;
}

function preserveLatinTokenCase(originalToken, replacement) {
  if (/^[A-Z]/u.test(originalToken)) {
    return replacement.replace(/^[a-z]/u, (letter) => letter.toUpperCase());
  }
  return replacement;
}

function replaceCompactLatinPhrase(value, from, to) {
  const pattern = new RegExp(`(^|[^A-Za-z])(${escapeRegExp(from)})(?=$|[^A-Za-z])`, 'giu');
  return String(value).replace(pattern, (match, leading, compactValue) => (
    `${leading}${preserveLatinTokenCase(compactValue, to)}`
  ));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function segmentLatinCompound(lower) {
  const best = new Array(lower.length + 1).fill(undefined);
  best[lower.length] = { score: 0, parts: [] };

  for (let index = lower.length - 1; index >= 0; index -= 1) {
    for (let end = index + 1; end <= lower.length; end += 1) {
      const term = lower.slice(index, end);
      const next = best[end];
      if (!next || !latinSpacingTerms.has(term)) continue;
      const candidate = {
        score: next.score + (term.length * term.length) - 1,
        parts: [term, ...next.parts]
      };
      if (!best[index] || candidate.score > best[index].score) {
        best[index] = candidate;
      }
    }
  }

  return best[0]?.parts;
}

function normalizeFoodCategoryCode(value) {
  return cleanText(value).replace(/\.$/u, '');
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/gu, '')
    .replace(/，/g, ',')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .trim();
}

function formatSourceSentence(parts) {
  const text = parts.map((part) => String(part || '').trim()).filter(Boolean).join('；');
  return text.endsWith('。') ? text : `${text}。`;
}

function standardPageForPdfPage(pdfPage) {
  return pdfPage - 3;
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => Number.isInteger(value)))].sort((a, b) => a - b);
}

function assertRowCount(label, rows, expectedCount) {
  if (rows.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${label} rows, got ${rows.length}`);
  }
}

function assertSequentialRows(label, rows) {
  const firstMismatch = rows.find((row, index) => row.rowNumber !== index + 1);
  if (firstMismatch) {
    throw new Error(`${label} rowNumber must be sequential; expected ${rows.indexOf(firstMismatch) + 1}, got ${firstMismatch.rowNumber}`);
  }
}
