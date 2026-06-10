export const productCategories = [
  {
    id: 'food',
    label: '食品添加剂',
    routeBase: '/food',
    description: '食品添加剂、E-number、GB/INS 编号、ADI 和使用限量。'
  },
  {
    id: 'cosmetics',
    label: '化妆品成分',
    routeBase: '/cosmetics',
    description: '护肤和日化成分的用途、关注等级和适用提醒。'
  }
];

export const defaultCategory = 'food';
export const legacyCategory = 'cosmetics';

export function isProductCategory(value) {
  return productCategories.some((category) => category.id === value);
}

export function getProductCategory(value) {
  return productCategories.find((category) => category.id === value) || productCategories[0];
}

export function categoryPath(category, path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getProductCategory(category).routeBase}${normalizedPath === '/' ? '' : normalizedPath}`;
}
