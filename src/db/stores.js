import { apiRequest } from '../lib/api';

export async function getStores(orgId) {
  const data = await apiRequest(`/client/stores?orgId=${orgId}`);
  return (data.stores || []).filter((s) => s.isActive);
}

export async function createStore({ orgId, name, address, phone, email, storeCode }) {
  const data = await apiRequest('/client/stores', {
    method: 'POST',
    body: { orgId, name, address, phone, email, storeCode },
  });
  return data.store;
}

export async function getStoreById(storeId) {
  const data = await apiRequest(`/client/stores/${storeId}`);
  return data.store;
}
