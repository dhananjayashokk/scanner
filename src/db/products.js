import { apiRequest } from '../lib/api';

export async function searchMasterProducts({ query = '', categoryIds = [] }) {
  const params = new URLSearchParams({ limit: '100' });
  if (query) params.set('search', query);
  // category filter by name not supported server-side; filter client-side by categoryId
  const data = await apiRequest(`/product-master/available?storeId=0&${params}`);
  let products = data.data || [];
  if (categoryIds.length > 0) {
    // product-master/available returns categoryName; do client-side filter using categoryId
    // we map via the full category list if needed — for now return all and let UI filter
    products = products.filter((p) => categoryIds.includes(p.categoryId));
  }
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: { id: p.categoryId, name: p.categoryName },
    brand: { id: p.brandId, name: p.brandName },
    variants: [],
  }));
}

export async function getStoreProducts(storeId) {
  const data = await apiRequest(`/store/${storeId}/products?limit=200`);
  return (data.data || []).map((p) => ({
    id: p.id,
    price: p.price,
    cost_price: p.costPrice,
    mrp: p.mrp,
    is_available: p.isAvailable,
    combination: {
      id: p.productCombinationId,
      global_sku: p.globalSku,
      barcode: p.barcode,
      attributes: p.attributes,
      product: {
        id: p.productMasterId,
        name: p.productName,
        category_id: p.categoryId,
        category: { name: p.categoryName },
      },
    },
  }));
}

export async function addProductToStore(storeId, combinationId, { price, costPrice, mrp }) {
  const data = await apiRequest(`/store/${storeId}/products`, {
    method: 'POST',
    body: { products: [{ productCombinationId: combinationId, price, costPrice, mrp }] },
  });
  return (data.data || [])[0];
}

export async function createProductFromScan(storeId, scanResult, { price, costPrice, mrp, categoryId }) {
  const data = await apiRequest(`/store/${storeId}/products/scan`, {
    method: 'POST',
    body: {
      productName: scanResult.productName,
      description: scanResult.description,
      brand: scanResult.brand,
      barcode: scanResult.barcode,
      weightOrVolume: scanResult.weightOrVolume,
      countryOfOrigin: scanResult.countryOfOrigin,
      categoryId,
      price,
      costPrice,
      mrp,
    },
  });
  return data.data;
}

export async function updateStoreProduct(storeId, storeProductId, { price, costPrice, mrp, isAvailable }) {
  const data = await apiRequest(`/store/${storeId}/products/${storeProductId}`, {
    method: 'PUT',
    body: { price, costPrice, mrp, isAvailable },
  });
  return data.data;
}
