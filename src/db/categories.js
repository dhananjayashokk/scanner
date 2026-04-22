import { supabase } from '../lib/supabase';

// All categories in the global master list
export async function getAllCategories() {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

// Categories enabled for a specific store
export async function getStoreCategories(storeId) {
  const { data, error } = await supabase
    .from('store_categories')
    .select('id, is_active, category:product_categories(*)')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('category(name)');
  if (error) throw error;
  return data;
}

// Enable an existing global category for a store
export async function enableCategoryForStore(storeId, categoryId) {
  const { data, error } = await supabase
    .from('store_categories')
    .upsert({ store_id: storeId, category_id: categoryId, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Disable a category for a store
export async function disableCategoryForStore(storeId, categoryId) {
  const { error } = await supabase
    .from('store_categories')
    .update({ is_active: false })
    .eq('store_id', storeId)
    .eq('category_id', categoryId);
  if (error) throw error;
}

// Create a new category in the global master list and enable it for the store
export async function createCategoryAndEnableForStore(storeId, { name, description }) {
  // Get default tax config (use first active one)
  const { data: taxConfig, error: taxError } = await supabase
    .from('tax_configuration')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();
  if (taxError) throw new Error('No active tax configuration found. Please set one up first.');

  const { data: category, error: catError } = await supabase
    .from('product_categories')
    .insert({ name, description, tax_config_id: taxConfig.id })
    .select()
    .single();
  if (catError) throw catError;

  await enableCategoryForStore(storeId, category.id);
  return category;
}
