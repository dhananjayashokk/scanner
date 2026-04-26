import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getStoreProducts, searchMasterProducts, addProductToStore, updateStoreProduct } from '../../src/db/products';

export default function ProductsScreen() {
  const { storeId, storeName, categoryId, categoryName } = useLocalSearchParams();
  const router = useRouter();

  const [storeProducts, setStoreProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [masterProducts, setMasterProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [priceModal, setPriceModal] = useState({ visible: false, combination: null });
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [mrp, setMrp] = useState('');

  const [togglingId, setTogglingId] = useState(null);
  const [detailModal, setDetailModal] = useState({ visible: false, product: null });
  const [editPrice, setEditPrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editMrp, setEditMrp] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStoreProducts(Number(storeId));
      const filtered = data.filter(
        (sp) => sp.combination?.product?.category_id === Number(categoryId)
      );
      setStoreProducts(filtered);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [storeId, categoryId]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    setSearching(true);
    try {
      const results = await searchMasterProducts({ query: q, categoryIds: [Number(categoryId)] });
      const addedCombinationIds = new Set(storeProducts.map((sp) => sp.product_combination_id));
      setMasterProducts(results.flatMap((p) =>
        (p.variants || []).filter((v) => !addedCombinationIds.has(v.id)).map((v) => ({
          ...v,
          productName: p.name,
          categoryName: p.category?.name,
          brandName: p.brand?.name,
        }))
      ));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSearching(false);
    }
  }, [categoryId, storeProducts]);

  useEffect(() => { if (addModalVisible) handleSearch(''); }, [addModalVisible]);

  const openPriceModal = (combination) => {
    setPriceModal({ visible: true, combination });
    setPrice('');
    setCostPrice('');
    setMrp('');
  };

  const handleAddToStore = async () => {
    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert('Error', 'Please enter a valid selling price.');
      return;
    }
    setSaving(true);
    try {
      await addProductToStore(Number(storeId), priceModal.combination.id, {
        price: Number(price),
        costPrice: costPrice ? Number(costPrice) : null,
        mrp: mrp ? Number(mrp) : null,
      });
      setPriceModal({ visible: false, combination: null });
      setAddModalVisible(false);
      await load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailable = async (item) => {
    setTogglingId(item.id);
    try {
      await updateStoreProduct(item.id, { isAvailable: !item.is_available });
      await load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setTogglingId(null);
    }
  };

  const openDetailModal = (item) => {
    setDetailModal({ visible: true, product: item });
    setEditPrice(String(item.price || ''));
    setEditCostPrice(String(item.cost_price || ''));
    setEditMrp(String(item.mrp || ''));
  };

  const handleSaveDetail = async () => {
    if (!editPrice.trim() || isNaN(Number(editPrice))) {
      Alert.alert('Error', 'Please enter a valid selling price.');
      return;
    }
    setEditSaving(true);
    try {
      await updateStoreProduct(detailModal.product.id, {
        price: Number(editPrice),
        costPrice: editCostPrice ? Number(editCostPrice) : null,
        mrp: editMrp ? Number(editMrp) : null,
      });
      setDetailModal({ visible: false, product: null });
      await load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setEditSaving(false);
    }
  };

  const renderStoreProduct = ({ item }) => {
    const isToggling = togglingId === item.id;
    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetailModal(item)} activeOpacity={0.75}>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.combination?.product?.name}</Text>
          <Text style={styles.cardMeta}>SKU: {item.combination?.global_sku}</Text>
          {item.combination?.barcode ? <Text style={styles.cardMeta}>Barcode: {item.combination.barcode}</Text> : null}
          <Text style={styles.editHint}>Tap to edit ›</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.priceText}>₹{item.price}</Text>
          {item.mrp ? <Text style={styles.mrpText}>MRP ₹{item.mrp}</Text> : null}
          <View style={styles.toggleBlock}>
            {isToggling ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Switch
                value={!!item.is_available}
                onValueChange={() => handleToggleAvailable(item)}
                disabled={togglingId !== null}
                trackColor={{ false: '#E2E8F0', true: '#A5B4FC' }}
                thumbColor={item.is_available ? '#4F46E5' : '#94A3B8'}
                ios_backgroundColor="#E2E8F0"
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>{storeName} › {categoryName}</Text>
          <Text style={styles.headerTitle}>Products</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, styles.scanButton]}
            onPress={() => router.push({ pathname: '/(app)/scan', params: { storeId, storeName, categoryId, categoryName } })}
          >
            <Text style={styles.addButtonText}>⊙ Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#4F46E5" />
      ) : (
        <FlatList
          data={storeProducts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStoreProduct}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>📦</Text>
              </View>
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptyDesc}>Tap "+ Add" to pick from catalog or "Scan" to scan a new product.</Text>
            </View>
          }
        />
      )}

      {/* Product detail / edit modal */}
      <Modal visible={detailModal.visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Product</Text>
            <TouchableOpacity onPress={() => setDetailModal({ visible: false, product: null })} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
          {detailModal.product && (
            <>
              <View style={styles.detailInfoCard}>
                <Text style={styles.detailName}>{detailModal.product.combination?.product?.name}</Text>
                {detailModal.product.combination?.global_sku ? (
                  <Text style={styles.detailMeta}>SKU: {detailModal.product.combination.global_sku}</Text>
                ) : null}
                {detailModal.product.combination?.barcode ? (
                  <Text style={styles.detailMeta}>Barcode: {detailModal.product.combination.barcode}</Text>
                ) : null}
              </View>

              <Text style={styles.sectionLabel}>Pricing</Text>
              <Text style={styles.inputLabel}>Selling Price *</Text>
              <TextInput style={styles.input} placeholder="e.g. 99" placeholderTextColor="#94A3B8" value={editPrice} onChangeText={setEditPrice} keyboardType="decimal-pad" />
              <Text style={styles.inputLabel}>Cost Price</Text>
              <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#94A3B8" value={editCostPrice} onChangeText={setEditCostPrice} keyboardType="decimal-pad" />
              <Text style={styles.inputLabel}>MRP</Text>
              <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#94A3B8" value={editMrp} onChangeText={setEditMrp} keyboardType="decimal-pad" />

              <TouchableOpacity
                style={[styles.saveButton, editSaving && { opacity: 0.6 }]}
                onPress={handleSaveDetail}
                disabled={editSaving}
              >
                {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
              </TouchableOpacity>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Add from master catalog modal */}
      <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Product</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or SKU..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searching ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#4F46E5" />
          ) : (
            <FlatList
              data={masterProducts}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.masterRow} onPress={() => openPriceModal(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.productName}</Text>
                    <Text style={styles.cardMeta}>SKU: {item.global_sku}{item.brandName ? ` · ${item.brandName}` : ''}</Text>
                    {item.barcode ? <Text style={styles.cardMeta}>Barcode: {item.barcode}</Text> : null}
                  </View>
                  <View style={styles.setPriceBadge}>
                    <Text style={styles.setPriceText}>Set Price</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No products found</Text>
                  <Text style={styles.emptyDesc}>Use "Scan" to add a new product to the catalog.</Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Price entry modal */}
      <Modal visible={priceModal.visible} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Pricing</Text>
            <TouchableOpacity onPress={() => setPriceModal({ visible: false, combination: null })} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {priceModal.combination && (
            <View style={styles.detailInfoCard}>
              <Text style={styles.detailName}>{priceModal.combination.productName}</Text>
              <Text style={styles.detailMeta}>SKU: {priceModal.combination.global_sku}</Text>
            </View>
          )}
          <Text style={styles.inputLabel}>Selling Price *</Text>
          <TextInput style={styles.input} placeholder="e.g. 99" placeholderTextColor="#94A3B8" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <Text style={styles.inputLabel}>Cost Price</Text>
          <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#94A3B8" value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" />
          <Text style={styles.inputLabel}>MRP</Text>
          <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#94A3B8" value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" />
          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleAddToStore} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Add to Store</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerLabel: { fontSize: 12, fontWeight: '700', color: '#4F46E5', textTransform: 'uppercase', letterSpacing: 0.6 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  addButton: { backgroundColor: '#4F46E5', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  scanButton: { backgroundColor: '#10B981' },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 2, borderWidth: 1, borderColor: '#F1F5F9',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cardMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  editHint: { fontSize: 11, color: '#6366F1', fontWeight: '600', marginTop: 5 },
  cardRight: { alignItems: 'flex-end', marginLeft: 12 },
  priceText: { fontSize: 17, fontWeight: '800', color: '#4F46E5' },
  mrpText: { fontSize: 11, color: '#94A3B8', textDecorationLine: 'line-through', marginTop: 2 },
  toggleBlock: { marginTop: 8 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIconText: { fontSize: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  modal: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingTop: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 16, color: '#4F46E5', fontWeight: '600' },

  detailInfoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  detailName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  detailMeta: { fontSize: 13, color: '#64748B', marginTop: 2 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#0F172A', marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#4F46E5', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4,
    shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  searchInput: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#0F172A', marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  masterRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9',
  },
  setPriceBadge: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  setPriceText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },
});
