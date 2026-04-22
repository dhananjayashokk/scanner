import { supabase } from '../lib/supabase';

// Search master product catalog — optionally filtered by categories enabled for a store
export async function searchMasterProducts({ query = '', categoryIds = [] }) {
  let req = supabase
    .from('product_master')
    .select('*, category:product_categories(id, name), brand:brands(id, name), variants:product_variant_combinations(id, global_sku, barcode, attributes)')
    .order('name');

  if (query) {
    req = req.ilike('name', `%${query}%`);
  }
  if (categoryIds.length > 0) {
    req = req.in('category_id', categoryIds);
  }

  const { data, error } = await req;
  if (error) throw error;
  return data;
}

// Products already mapped to a store (with store-level overrides)
export async function getStoreProducts(storeId) {
  const { data, error } = await supabase
    .from('store_products')
    .select('*, combination:product_variant_combinations(id, global_sku, barcode, attributes, product:product_master(id, name, category_id, category:product_categories(name)))')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Map an existing product variant to a store
export async function addProductToStore(storeId, combinationId, { price, costPrice, mrp }) {
  const { data, error } = await supabase
    .from('store_products')
    .upsert({
      store_id: storeId,
      product_combination_id: combinationId,
      price,
      cost_price: costPrice,
      mrp,
      is_default: true,
      is_available: true,
      show_on_online: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Create a brand-new product from scan results, save to master catalog, and map to store
export async function createProductFromScan(storeId, scanResult, { price, costPrice, mrp, categoryId }) {
  // 1. Ensure brand exists or create it
  let brandId = null;
  if (scanResult.brand) {
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .ilike('name', scanResult.brand)
      .limit(1)
      .maybeSingle();

    if (existing) {
      brandId = existing.id;
    } else {
      const { data: newBrand, error: brandError } = await supabase
        .from('brands')
        .insert({ name: scanResult.brand })
        .select('id')
        .single();
      if (brandError) throw brandError;
      brandId = newBrand.id;
    }
  }

  // 2. Create product_master record
  const { data: product, error: productError } = await supabase
    .from('product_master')
    .insert({
      name: scanResult.productName,
      description: scanResult.description,
      category_id: categoryId,
      brand_id: brandId,
    })
    .select()
    .single();
  if (productError) throw productError;

  // 3. Create product_variant_combination (single default variant)
  const sku = scanResult.barcode || `SKU-${Date.now()}`;
  const { data: combination, error: combinationError } = await supabase
    .from('product_variant_combinations')
    .insert({
      product_master_id: product.id,
      global_sku: sku,
      barcode: scanResult.barcode || null,
      attributes: {
        weight: scanResult.weightOrVolume,
        country_of_origin: scanResult.countryOfOrigin,
      },
      is_active: true,
    })
    .select()
    .single();
  if (combinationError) throw combinationError;

  // 4. Map to store
  const storeProduct = await addProductToStore(storeId, combination.id, { price, costPrice, mrp });

  return { product, combination, storeProduct };
}

// Update store-specific overrides (price, availability)
export async function updateStoreProduct(storeProductId, { price, costPrice, mrp, isAvailable }) {
  const { data, error } = await supabase
    .from('store_products')
    .update({ price, cost_price: costPrice, mrp, is_available: isAvailable })
    .eq('id', storeProductId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
