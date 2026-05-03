import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  getStoreCategories, getAllCategories,
  enableCategoryForStore, disableCategoryForStore, createCategoryAndEnableForStore,
} from '../../src/db/categories';

export default function CategoriesScreen() {
  const { storeId, storeName } = useLocalSearchParams();
  const router = useRouter();

  const [storeCategories, setStoreCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [storeCats, allCats] = await Promise.all([
        getStoreCategories(Number(storeId)),
        getAllCategories(),
      ]);
      setStoreCategories(storeCats);
      setAllCategories(allCats);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const enabledIds = new Set(storeCategories.map((sc) => sc.category.id));

  const filteredAll = allCategories.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = showActiveOnly ? enabledIds.has(c.id) : true;
    return matchesSearch && matchesFilter;
  });

  const enabledCount = filteredAll.filter((c) => enabledIds.has(c.id)).length;

  const handleToggle = async (categoryId, currentlyEnabled) => {
    setTogglingId(categoryId);
    try {
      if (currentlyEnabled) {
        await disableCategoryForStore(Number(storeId), categoryId);
      } else {
        await enableCategoryForStore(Number(storeId), categoryId);
      }
      const storeCats = await getStoreCategories(Number(storeId));
      setStoreCategories(storeCats);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateNew = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name is required.');
      return;
    }
    setSaving(true);
    try {
      await createCategoryAndEnableForStore(Number(storeId), {
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim() || null,
      });
      setCreateModalVisible(false);
      setNewCategoryName('');
      setNewCategoryDesc('');
      await load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderCategory = ({ item }) => {
    const isEnabled = enabledIds.has(item.id);
    const isToggling = togglingId === item.id;

    return (
      <TouchableOpacity
        style={[styles.card, isEnabled && styles.cardEnabled]}
        onPress={() => {
          if (isEnabled) {
            router.push({
              pathname: '/(app)/products',
              params: { storeId, storeName, categoryId: item.id, categoryName: item.name },
            });
          }
        }}
        activeOpacity={isEnabled ? 0.7 : 1}
      >
        <View style={[styles.categoryDot, { backgroundColor: isEnabled ? '#4F46E5' : '#CBD5E1' }]} />
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, !isEnabled && styles.cardTitleDisabled]}>{item.name}</Text>
          {item.description ? <Text style={styles.cardMeta}>{item.description}</Text> : null}
          {isEnabled && <Text style={styles.cardHint}>Tap to manage products ›</Text>}
        </View>
        <View style={styles.toggleBlock}>
          {isToggling ? (
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : (
            <Switch
              value={isEnabled}
              onValueChange={() => handleToggle(item.id, isEnabled)}
              disabled={togglingId !== null}
              trackColor={{ false: '#E2E8F0', true: '#A5B4FC' }}
              thumbColor={isEnabled ? '#4F46E5' : '#94A3B8'}
              ios_backgroundColor="#E2E8F0"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>{storeName}</Text>
          <Text style={styles.headerTitle}>Categories</Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {!loading && (
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statChipText}>{enabledCount} enabled</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.statChipText, { color: '#64748B' }]}>{filteredAll.length - enabledCount} disabled</Text>
          </View>
          <TouchableOpacity
            style={[styles.statChip, showActiveOnly && styles.filterChipActive]}
            onPress={() => setShowActiveOnly((v) => !v)}
          >
            <Text style={[styles.statChipText, showActiveOnly && { color: '#fff' }]}>
              {showActiveOnly ? '✓ Active only' : 'Active only'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        style={styles.searchInput}
        placeholder="Search categories..."
        placeholderTextColor="#94A3B8"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#4F46E5" />
      ) : (
        <FlatList
          data={filteredAll}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCategory}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No categories found</Text>
              <Text style={styles.emptyDesc}>Try a different search or create a new category.</Text>
            </View>
          }
        />
      )}

      <Modal visible={createModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Category</Text>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Saved to the global master list and auto-enabled for this store.</Text>

          <Text style={styles.inputLabel}>Category Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Dairy & Eggs" placeholderTextColor="#94A3B8" value={newCategoryName} onChangeText={setNewCategoryName} />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput style={[styles.input, { height: 80 }]} placeholder="Optional description" placeholderTextColor="#94A3B8" value={newCategoryDesc} onChangeText={setNewCategoryDesc} multiline />

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleCreateNew} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Create & Enable</Text>}
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
  createButton: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  createButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 10 },
  statChip: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statChipText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  filterChipActive: { backgroundColor: '#4F46E5' },

  searchInput: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#0F172A', marginHorizontal: 20, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },

  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2, borderWidth: 1, borderColor: '#F1F5F9',
  },
  cardEnabled: { borderColor: '#C7D2FE' },
  categoryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  cardBody: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cardTitleDisabled: { color: '#94A3B8' },
  cardMeta: { fontSize: 13, color: '#64748B', marginTop: 2 },
  cardHint: { fontSize: 11, color: '#6366F1', fontWeight: '600', marginTop: 5 },
  toggleBlock: { justifyContent: 'center', minWidth: 52 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  modal: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingTop: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 16, color: '#4F46E5', fontWeight: '600' },
  helperText: { fontSize: 13, color: '#64748B', marginBottom: 24, lineHeight: 18 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#0F172A', marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4,
    shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
