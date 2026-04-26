import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getOrganizations, createOrganization } from '../../src/db/organizations';

function OrgAvatar({ name }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
  const colors = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <View style={[styles.avatar, { backgroundColor: color + '18', borderColor: color + '30' }]}>
      <Text style={[styles.avatarText, { color }]}>{initials}</Text>
    </View>
  );
}

export default function OrganizationsScreen() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrganizations();
      setOrgs(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrgs(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Organization name is required.');
      return;
    }
    setSaving(true);
    try {
      await createOrganization(form);
      setModalVisible(false);
      setForm({ name: '', phone: '', email: '', address: '' });
      loadOrgs();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderOrg = ({ item }) => {
    const contact = item.contactInfo || {};
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/(app)/stores', params: { orgId: item.id, orgName: item.name } })}
        activeOpacity={0.75}
      >
        <OrgAvatar name={item.name} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {contact.email ? <Text style={styles.cardMeta}>{contact.email}</Text> : null}
          {contact.phone ? <Text style={styles.cardMeta}>{contact.phone}</Text> : null}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.storeCount} {item.storeCount === 1 ? 'store' : 'stores'}
            </Text>
          </View>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>GoGenie</Text>
          <Text style={styles.headerTitle}>Organizations</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#4F46E5" />
      ) : (
        <FlatList
          data={orgs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrg}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>🏢</Text>
              </View>
              <Text style={styles.emptyTitle}>No organizations yet</Text>
              <Text style={styles.emptyDesc}>Tap "+ New" to onboard your first organization.</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Organization</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Organization Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Fresh Mart Pvt Ltd" placeholderTextColor="#94A3B8" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />

          <Text style={styles.inputLabel}>Phone</Text>
          <TextInput style={styles.input} placeholder="+91 98765 43210" placeholderTextColor="#94A3B8" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput style={styles.input} placeholder="contact@freshmart.com" placeholderTextColor="#94A3B8" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.inputLabel}>Address</Text>
          <TextInput style={[styles.input, { height: 80 }]} placeholder="Street, City, State" placeholderTextColor="#94A3B8" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} multiline />

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Create Organization</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerLabel: { fontSize: 12, fontWeight: '700', color: '#4F46E5', textTransform: 'uppercase', letterSpacing: 0.8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  addButton: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, borderWidth: 1,
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardMeta: { fontSize: 13, color: '#64748B', marginTop: 2 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  arrow: { fontSize: 22, color: '#CBD5E1', marginLeft: 8 },

  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIconText: { fontSize: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  modal: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingTop: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 16, color: '#4F46E5', fontWeight: '600' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#0F172A', marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#4F46E5', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4,
    shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
