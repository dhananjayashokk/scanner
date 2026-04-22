import { supabase } from '../lib/supabase';

export async function getStores(organizationId) {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
}

export async function createStore({ organizationId, name, address, phone, email, storeCode }) {
  const { data, error } = await supabase
    .from('stores')
    .insert({
      organization_id: organizationId,
      name,
      address,
      phone,
      email,
      store_code: storeCode,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getStoreById(storeId) {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single();
  if (error) throw error;
  return data;
}
