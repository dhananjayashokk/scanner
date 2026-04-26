import { apiRequest } from '../lib/api';

export async function getAllCategories() {
  const data = await apiRequest('/api/categories?limit=200');
  return data.data || [];
}

export async function getStoreCategories(storeId) {
  const data = await apiRequest(`/api/store/${storeId}/categories`);
  return (data.data || []).map((row) => ({
    id: row.id,
    is_active: row.isActive,
    category: {
      id: row.categoryId,
      name: row.categoryName,
      description: row.categoryDescription,
      image_url: row.categoryImageUrl,
    },
  }));
}

export async function enableCategoryForStore(storeId, categoryId) {
  const data = await apiRequest(`/api/store/${storeId}/categories`, {
    method: 'POST',
    body: { categoryId },
  });
  return data.data;
}

export async function disableCategoryForStore(storeId, categoryId) {
  await apiRequest(`/api/store/${storeId}/categories/${categoryId}`, { method: 'DELETE' });
}

export async function createCategoryAndEnableForStore(storeId, { name, description }) {
  const createData = await apiRequest('/api/categories', {
    method: 'POST',
    body: { name, description },
  });
  const category = createData.data;
  await enableCategoryForStore(storeId, category.id);
  return category;
}
