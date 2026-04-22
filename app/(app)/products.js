import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getStoreProducts, searchMasterProducts, addProductToStore } from '../../src/db/products';

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStoreProducts(Number(storeId));
      // Filter to only products in this category
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
      // Exclude already-added products
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

  useEffect(() => {
    if (addModalVisible) handleSearch('');
  }, [addModalVisible]);

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

  const renderStoreProduct = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.combination?.product?.name}</Text>
        <Text style={styles.productMeta}>SKU: {item.combination?.global_sku}</Text>
        {item.combination?.barcode ? <Text style={styles.productMeta}>Barcode: {item.combination.barcode}</Text> : null}
      </View>
      <View style={styles.priceBlock}>
        <Text style={styles.price}>₹{item.price}</Text>
        {item.mrp ? <Text style={styles.mrp}>MRP ₹{item.mrp}</Text> : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.breadcrumb}>{storeName} › {categoryName}</Text>
          <Text style={styles.title}>Products</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#00b894', marginLeft: 8 }]}
            onPress={() => router.push({
              pathname: '/(app)/scan',
              params: { storeId, storeName, categoryId, categoryName },
            })}
          >
            <Text style={styles.addButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#0984e3" />
      ) : (
        <FlatList
          data={storeProducts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStoreProduct}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No products yet.{'\n'}Tap "+ Add" to pick from the master catalog or "Scan" to scan a new product.</Text>
          }
        />
      )}

      {/* Add from master catalog modal */}
      <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Product</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searching ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#0984e3" />
          ) : (
            <FlatList
              data={masterProducts}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.masterProductRow} onPress={() => openPriceModal(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{item.productName}</Text>
                    <Text style={styles.productMeta}>SKU: {item.global_sku}{item.brandName ? ` · ${item.brandName}` : ''}</Text>
                    {item.barcode ? <Text style={styles.productMeta}>Barcode: {item.barcode}</Text> : null}
                  </View>
                  <Text style={styles.enableText}>Set Price</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No products found in this category. Use "Scan" to add a new product.</Text>}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Price entry modal */}
      <Modal visible={priceModal.visible} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Pricing</Text>
            <TouchableOpacity onPress={() => setPriceModal({ visible: false, combination: null })}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {priceModal.combination && (
            <Text style={styles.helperText}>{priceModal.combination.productName} · {priceModal.combination.global_sku}</Text>
          )}
          <TextInput style={styles.input} placeholder="Selling Price *" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <TextInput style={styles.input} placeholder="Cost Price (optional)" value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" />
          <TextInput style={styles.input} placeholder="MRP (optional)" value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" />
          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleAddToStore} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Add to Store</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 16, paddingBottom: 8 },
  breadcrumb: { fontSize: 11, color: '#0984e3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '800', color: '#2c3e50' },
  headerButtons: { flexDirection: 'row' },
  addButton: { backgroundColor: '#0984e3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { padding: 16 },
  productCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: '#2c3e50' },
  productMeta: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  priceBlock: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '800', color: '#0984e3' },
  mrp: { fontSize: 11, color: '#b2bec3', textDecorationLine: 'line-through' },
  empty: { textAlign: 'center', color: '#7f8c8d', marginTop: 40, fontSize: 14, lineHeight: 22, paddingHorizontal: 20 },
  modal: { flex: 1, backgroundColor: '#f5f6fa', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#2c3e50' },
  cancelText: { fontSize: 16, color: '#0984e3' },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#dfe6e9',
  },
  masterProductRow: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  enableText: { color: '#0984e3', fontWeight: '700', fontSize: 13 },
  helperText: { fontSize: 13, color: '#7f8c8d', marginBottom: 16 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#dfe6e9',
  },
  saveButton: { backgroundColor: '#0984e3', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
