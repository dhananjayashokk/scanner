import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../src/lib/supabase';
import { getStores, createStore } from '../../src/db/stores';

export default function StoresScreen() {
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState(null);

  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', storeCode: '' });

  const loadStores = useCallback(async (orgId) => {
    setLoading(true);
    try {
      const data = await getStores(orgId);
      setStores(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = auth.getUser();
    if (user?.organization_id) {
      setOrgId(user.organization_id);
      loadStores(user.organization_id);
    }
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Store name is required.');
      return;
    }
    setSaving(true);
    try {
      await createStore({ organizationId: orgId, ...form });
      setModalVisible(false);
      setForm({ name: '', address: '', phone: '', email: '', storeCode: '' });
      loadStores(orgId);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderStore = ({ item }) => (
    <TouchableOpacity
      style={styles.storeCard}
      onPress={() => router.push({ pathname: '/(app)/categories', params: { storeId: item.id, storeName: item.name } })}
    >
      <View style={styles.storeInfo}>
        <Text style={styles.storeName}>{item.name}</Text>
        {item.address ? <Text style={styles.storeMeta}>{item.address}</Text> : null}
        {item.store_code ? <Text style={styles.storeCode}>Code: {item.store_code}</Text> : null}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stores</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ New Store</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#0984e3" />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStore}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No stores yet. Create your first store.</Text>}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Store</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <TextInput style={styles.input} placeholder="Store Name *" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
          <TextInput style={styles.input} placeholder="Address" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} />
          <TextInput style={styles.input} placeholder="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Store Code (optional)" value={form.storeCode} onChangeText={(v) => setForm((f) => ({ ...f, storeCode: v }))} autoCapitalize="characters" />

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Create Store</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#2c3e50' },
  addButton: { backgroundColor: '#0984e3', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 16 },
  storeCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: '700', color: '#2c3e50' },
  storeMeta: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  storeCode: { fontSize: 12, color: '#0984e3', marginTop: 4, fontWeight: '600' },
  arrow: { fontSize: 22, color: '#b2bec3' },
  empty: { textAlign: 'center', color: '#7f8c8d', marginTop: 40, fontSize: 15 },
  modal: { flex: 1, backgroundColor: '#f5f6fa', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#2c3e50' },
  cancelText: { fontSize: 16, color: '#0984e3' },
  input: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#dfe6e9',
  },
  saveButton: { backgroundColor: '#0984e3', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
