import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Alert, TextInput, Modal,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { analyzeProductImages } from '../../src/api/kimiApi';
import { createProductFromScan } from '../../src/db/products';

const DEFAULT_API_KEY = 'sk-RP4MCNqAf9zvWJBoPyktFmmVVZhcPRjKbeAFffOVm1ROgDjG';
const MAX_IMAGES = 3;
const { width } = Dimensions.get('window');

const RESULT_FIELDS = [
  ['Product Name', 'productName'],
  ['Brand', 'brand'],
  ['Category', 'category'],
  ['Barcode', 'barcode'],
  ['Weight / Volume', 'weightOrVolume'],
  ['Country of Origin', 'countryOfOrigin'],
  ['Expiry Date', 'expiryDate'],
  ['Description', 'description'],
  ['Other Details', 'otherDetails'],
];

export default function ScanScreen() {
  const { storeId, storeName, categoryId, categoryName } = useLocalSearchParams();
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [images, setImages] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (permission?.status !== 'granted') requestPermission();
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current && images.length < MAX_IMAGES) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (photo.base64) setImages((prev) => [...prev, photo.base64]);
    }
  };

  const pickFromGallery = async () => {
    if (images.length >= MAX_IMAGES) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: false, quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setImages((prev) => [...prev, result.assets[0].base64]);
    }
  };

  const handleAnalyze = async () => {
    if (images.length === 0) {
      Alert.alert('No Images', 'Capture or select at least one image first.');
      return;
    }
    setAnalyzing(true);
    setScanResult(null);
    try {
      const result = await analyzeProductImages(images, DEFAULT_API_KEY);
      setScanResult(result);
      if (result.price) {
        const numericPrice = result.price.replace(/[^0-9.]/g, '');
        if (numericPrice) setPrice(numericPrice);
      }
    } catch (e) {
      Alert.alert('Analysis Failed', e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveToStore = async () => {
    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert('Error', 'Please enter a valid selling price.');
      return;
    }
    setSaving(true);
    try {
      await createProductFromScan(Number(storeId), scanResult, {
        price: Number(price),
        costPrice: costPrice ? Number(costPrice) : null,
        mrp: mrp ? Number(mrp) : null,
        categoryId: Number(categoryId),
      });
      Alert.alert('Success', `"${scanResult.productName}" has been added to ${storeName}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
      setPriceModalVisible(false);
    }
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <View style={styles.permissionIcon}>
          <Text style={styles.permissionIconText}>📷</Text>
        </View>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionDesc}>Allow camera access to scan product images for AI analysis.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerLabel}>{storeName} › {categoryName}</Text>
        <Text style={styles.headerTitle}>Scan Product</Text>

        {/* Camera */}
        {showCamera ? (
          <View style={styles.cameraCard}>
            <CameraView style={styles.camera} ref={cameraRef}>
              <View style={styles.cameraTopBar}>
                <View style={styles.cameraCounter}>
                  <Text style={styles.cameraCounterText}>{images.length} / {MAX_IMAGES}</Text>
                </View>
              </View>
              <View style={styles.cameraFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
            </CameraView>
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={[styles.captureButton, images.length >= MAX_IMAGES && { opacity: 0.4 }]}
                onPress={takePicture}
                disabled={images.length >= MAX_IMAGES}
              >
                <View style={styles.captureInner} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneCameraBtn} onPress={() => setShowCamera(false)}>
                <Text style={styles.doneCameraText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.openCameraBtn} onPress={() => setShowCamera(true)}>
            <Text style={styles.openCameraIcon}>📷</Text>
            <Text style={styles.openCameraText}>Open Camera</Text>
            <Text style={styles.openCameraHint}>Capture up to {MAX_IMAGES} images</Text>
          </TouchableOpacity>
        )}

        {/* Gallery Button */}
        <TouchableOpacity
          style={[styles.secondaryButton, images.length >= MAX_IMAGES && { opacity: 0.4 }]}
          onPress={pickFromGallery}
          disabled={images.length >= MAX_IMAGES}
        >
          <Text style={styles.secondaryButtonText}>🖼  Pick from Gallery</Text>
        </TouchableOpacity>

        {/* Thumbnails */}
        {images.length > 0 && (
          <View style={styles.thumbnailSection}>
            <Text style={styles.thumbnailLabel}>Captured Images</Text>
            <View style={styles.thumbnailRow}>
              {images.map((img, idx) => (
                <View key={idx} style={styles.thumbWrapper}>
                  <Image source={{ uri: `data:image/jpeg;base64,${img}` }} style={styles.thumb} />
                  <TouchableOpacity
                    style={styles.removeThumb}
                    onPress={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Text style={styles.removeThumbText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {Array.from({ length: MAX_IMAGES - images.length }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.thumbEmpty} />
              ))}
            </View>
          </View>
        )}

        {/* Analyze Button */}
        <TouchableOpacity
          style={[styles.analyzeButton, (analyzing || images.length === 0) && { opacity: 0.5 }]}
          onPress={handleAnalyze}
          disabled={analyzing || images.length === 0}
        >
          {analyzing ? (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={[styles.analyzeButtonText, { marginLeft: 10 }]}>Analyzing with AI…</Text>
            </View>
          ) : (
            <Text style={styles.analyzeButtonText}>✦  Analyze with AI</Text>
          )}
        </TouchableOpacity>

        {/* Scan Result */}
        {scanResult && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultBadge}>
                <Text style={styles.resultBadgeText}>AI Result</Text>
              </View>
              <Text style={styles.resultProductName}>{scanResult.productName}</Text>
            </View>

            {RESULT_FIELDS.map(([label, key]) =>
              scanResult[key] ? (
                <View key={key} style={styles.resultRow}>
                  <Text style={styles.resultLabel}>{label}</Text>
                  <Text style={styles.resultValue}>{scanResult[key]}</Text>
                </View>
              ) : null
            )}

            <TouchableOpacity style={styles.saveToStoreBtn} onPress={() => setPriceModalVisible(true)}>
              <Text style={styles.saveToStoreBtnText}>Set Price & Save to Store</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Pricing Modal */}
      <Modal visible={priceModalVisible} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Pricing</Text>
            <TouchableOpacity onPress={() => setPriceModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {scanResult && (
            <View style={styles.modalProductInfo}>
              <Text style={styles.modalProductName}>{scanResult.productName}</Text>
              {scanResult.brand ? <Text style={styles.modalProductMeta}>{scanResult.brand}</Text> : null}
            </View>
          )}
          <Text style={styles.inputLabel}>Selling Price *</Text>
          <TextInput style={styles.input} placeholder="e.g. 99" placeholderTextColor="#94A3B8" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <Text style={styles.inputLabel}>Cost Price</Text>
          <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#94A3B8" value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" />
          <Text style={styles.inputLabel}>MRP</Text>
          <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#94A3B8" value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" />
          <TouchableOpacity style={[styles.primaryButton, saving && { opacity: 0.6 }]} onPress={handleSaveToStore} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Confirm & Save</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  headerLabel: { fontSize: 12, fontWeight: '700', color: '#4F46E5', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 20 },

  permissionScreen: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 40 },
  permissionIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  permissionIconText: { fontSize: 36 },
  permissionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  permissionDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 28 },

  openCameraBtn: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 12,
    borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  openCameraIcon: { fontSize: 36, marginBottom: 8 },
  openCameraText: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  openCameraHint: { fontSize: 13, color: '#94A3B8' },

  cameraCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, backgroundColor: '#000' },
  camera: { width: width - 40, height: (width - 40) * 1.15 },
  cameraTopBar: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'flex-end' },
  cameraCounter: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  cameraCounterText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cameraFrame: { position: 'absolute', top: '15%', left: '10%', right: '10%', bottom: '15%' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#fff', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  cameraControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, paddingVertical: 16, backgroundColor: '#0F172A' },
  captureButton: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#EF4444' },
  doneCameraBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  doneCameraText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  secondaryButton: {
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600', color: '#475569' },

  thumbnailSection: { marginBottom: 16 },
  thumbnailLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  thumbnailRow: { flexDirection: 'row', gap: 10 },
  thumbWrapper: { position: 'relative' },
  thumb: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#E2E8F0' },
  thumbEmpty: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  removeThumb: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#EF4444', width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  removeThumbText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  analyzeButton: {
    backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#6366F1', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  analyzeButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  analyzingRow: { flexDirection: 'row', alignItems: 'center' },

  resultCard: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
    elevation: 4, borderWidth: 1, borderColor: '#E0E7FF', overflow: 'hidden',
  },
  resultHeader: { backgroundColor: '#EEF2FF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E7FF' },
  resultBadge: { alignSelf: 'flex-start', backgroundColor: '#4F46E5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  resultBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultProductName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 11, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  resultLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', flex: 1 },
  resultValue: { fontSize: 13, color: '#0F172A', flex: 1.5, textAlign: 'right' },
  saveToStoreBtn: {
    margin: 16, backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  saveToStoreBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  primaryButton: {
    backgroundColor: '#4F46E5', paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  modal: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingTop: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 16, color: '#4F46E5', fontWeight: '600' },
  modalProductInfo: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  modalProductName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  modalProductMeta: { fontSize: 13, color: '#64748B', marginTop: 3 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#0F172A', marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0',
  },
});
