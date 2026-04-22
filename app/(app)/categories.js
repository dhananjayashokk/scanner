import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal, SectionList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  getStoreCategories, getAllCategories,
  enableCategoryForStore, disableCategoryForStore, createCategoryAndEnableForStore,
} from '../../src/db/categories';

export default function CategoriesScreen() {
  const { storeId, storeName } = useLocalSearchParams();
  const router = useRouter();

  const [storeCategories, setStoreCategories] = useState([]); // {id, category}[]
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredAll = allCategories.filter(
    (c) => !enabledIds.has(c.id) && c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEnable = async (categoryId) => {
    setSaving(true);
    try {
      await enableCategoryForStore(Number(storeId), categoryId);
      await load();
      setAddModalVisible(false);
      setSearchQuery('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = (categoryId, categoryName) => {
    Alert.alert(
      'Remove Category',
      `Remove "${categoryName}" from this store? Products under this category will remain but won't be associated with the category here.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await disableCategoryForStore(Number(storeId), categoryId);
              await load();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
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

  const renderEnabledCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => router.push({
        pathname: '/(app)/products',
        params: { storeId, storeName, categoryId: item.category.id, categoryName: item.category.name },
      })}
    >
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.category.name}</Text>
        {item.category.description ? <Text style={styles.categoryDesc}>{item.category.description}</Text> : null}
      </View>
      <View style={styles.categoryActions}>
        <Text style={styles.arrow}>›</Text>
        <TouchableOpacity onPress={() => handleDisable(item.category.id, item.category.name)} style={styles.removeBtn}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.storeName}>{storeName}</Text>
          <Text style={styles.title}>Categories</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Enable</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: '#00b894', marginLeft: 8 }]} onPress={() => setCreateModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#0984e3" />
      ) : (
        <FlatList
          data={storeCategories}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEnabledCategory}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No categories enabled yet.{'\n'}Tap "+ Enable" to add from the global list or "+ Create" to make a new one.</Text>
          }
        />
      )}

      {/* Enable existing category modal */}
      <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enable Category</Text>
            <TouchableOpacity onPress={() => { setAddModalVisible(false); setSearchQuery(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <FlatList
            data={filteredAll}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.globalCategoryRow} onPress={() => handleEnable(item.id)} disabled={saving}>
                <View>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  {item.description ? <Text style={styles.categoryDesc}>{item.description}</Text> : null}
                </View>
                <Text style={styles.enableText}>Enable</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No categories to add. All global categories are already enabled, or try a different search.</Text>}
          />
        </SafeAreaView>
      </Modal>

      {/* Create new category modal */}
      <Modal visible={createModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Category</Text>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>This will be saved to the global master list and enabled for this store.</Text>
          <TextInput
            style={styles.input}
            placeholder="Category Name *"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Description (optional)"
            value={newCategoryDesc}
            onChangeText={setNewCategoryDesc}
            multiline
          />
          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleCreateNew} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Create & Enable</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 16, paddingBottom: 8 },
  storeName: { fontSize: 12, color: '#0984e3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '800', color: '#2c3e50' },
  headerButtons: { flexDirection: 'row' },
  addButton: { backgroundColor: '#0984e3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { padding: 16 },
  categoryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#2c3e50' },
  categoryDesc: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  categoryActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: { fontSize: 22, color: '#b2bec3' },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 14, color: '#ff4757', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#7f8c8d', marginTop: 40, fontSize: 14, lineHeight: 22, paddingHorizontal: 20 },
  modal: { flex: 1, backgroundColor: '#f5f6fa', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#2c3e50' },
  cancelText: { fontSize: 16, color: '#0984e3' },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#dfe6e9',
  },
  globalCategoryRow: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  enableText: { color: '#0984e3', fontWeight: '700', fontSize: 14 },
  helperText: { fontSize: 13, color: '#7f8c8d', marginBottom: 16, lineHeight: 18 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#dfe6e9',
  },
  saveButton: { backgroundColor: '#00b894', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
