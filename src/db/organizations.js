import { apiRequest } from '../lib/api';

export async function getOrganizations() {
  const data = await apiRequest('/api/onboard/organizations');
  return data.organizations || [];
}

export async function createOrganization({ name, phone, email, address }) {
  const data = await apiRequest('/api/onboard/organizations', {
    method: 'POST',
    body: { name, phone, email, address },
  });
  return data.organization;
}
