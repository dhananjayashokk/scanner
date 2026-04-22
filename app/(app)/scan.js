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

export default function ScanScreen() {
  const { storeId, storeName, categoryId, categoryName } = useLocalSearchParams();
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [images, setImages] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Pricing modal state
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
      // Pre-fill price from scan if available
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
      <SafeAreaView style={styles.center}>
        <Text style={styles.permissionText}>Camera access is required to scan products.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.breadcrumb}>{storeName} › {categoryName}</Text>
        <Text style={styles.title}>Scan Product</Text>

        {/* Camera */}
        {showCamera ? (
          <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} ref={cameraRef}>
              <View style={styles.cameraOverlay}>
                <Text style={styles.cameraText}>{images.length}/{MAX_IMAGES} captured</Text>
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
              <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setShowCamera(false)}>
                <Text style={styles.buttonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={() => setShowCamera(true)}>
            <Text style={styles.buttonText}>Open Camera</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={pickFromGallery}>
          <Text style={[styles.buttonText, { color: '#2c3e50' }]}>Pick from Gallery</Text>
        </TouchableOpacity>

        {/* Thumbnails */}
        {images.length > 0 && (
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
          </View>
        )}

        {/* Analyze */}
        <TouchableOpacity
          style={[styles.button, styles.analyzeButton, (analyzing || images.length === 0) && { opacity: 0.5 }]}
          onPress={handleAnalyze}
          disabled={analyzing || images.length === 0}
        >
          {analyzing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Analyze with AI</Text>}
        </TouchableOpacity>

        {/* Scan Result */}
        {scanResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Scan Result</Text>
            {[
              ['Product Name', scanResult.productName],
              ['Brand', scanResult.brand],
              ['Category', scanResult.category],
              ['Barcode', scanResult.barcode],
              ['Weight / Volume', scanResult.weightOrVolume],
              ['Description', scanResult.description],
              ['Country of Origin', scanResult.countryOfOrigin],
              ['Expiry Date', scanResult.expiryDate],
              ['Other Details', scanResult.otherDetails],
            ].map(([label, value]) =>
              value ? (
                <View key={label} style={styles.resultRow}>
                  <Text style={styles.resultLabel}>{label}</Text>
                  <Text style={styles.resultValue}>{value}</Text>
                </View>
              ) : null
            )}

            <TouchableOpacity
              style={[styles.button, styles.saveButton, { marginTop: 16 }]}
              onPress={() => setPriceModalVisible(true)}
            >
              <Text style={styles.buttonText}>Save to Store</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Pricing Modal */}
      <Modal visible={priceModalVisible} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Pricing</Text>
            <TouchableOpacity onPress={() => setPriceModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {scanResult && (
            <Text style={styles.helperText}>{scanResult.productName}{scanResult.brand ? ` · ${scanResult.brand}` : ''}</Text>
          )}
          <TextInput style={styles.input} placeholder="Selling Price *" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <TextInput style={styles.input} placeholder="Cost Price (optional)" value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" />
          <TextInput style={styles.input} placeholder="MRP (optional)" value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" />
          <TouchableOpacity style={[styles.button, styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSaveToStore} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirm & Save</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f5f6fa' },
  breadcrumb: { fontSize: 11, color: '#0984e3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#2c3e50', marginBottom: 20 },
  permissionText: { fontSize: 15, color: '#636e72', textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#0984e3', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryButton: { backgroundColor: '#dfe6e9' },
  analyzeButton: { backgroundColor: '#6c5ce7' },
  saveButton: { backgroundColor: '#00b894' },
  cameraContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: 12, backgroundColor: '#000' },
  camera: { width: width - 32, height: (width - 32) * 1.2 },
  cameraOverlay: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  cameraText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cameraControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 14, backgroundColor: '#000' },
  captureButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ff4757' },
  closeCameraBtn: { backgroundColor: '#2f3542', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  thumbnailRow: { flexDirection: 'row', marginBottom: 12 },
  thumbWrapper: { position: 'relative', marginRight: 10 },
  thumb: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#dfe6e9' },
  removeThumb: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#ff4757', width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  removeThumbText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  resultCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  resultTitle: { fontSize: 16, fontWeight: '800', color: '#2c3e50', marginBottom: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  resultLabel: { fontSize: 13, fontWeight: '600', color: '#576574', flex: 1 },
  resultValue: { fontSize: 13, color: '#2f3542', flex: 1.5, textAlign: 'right' },
  modal: { flex: 1, backgroundColor: '#f5f6fa', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#2c3e50' },
  cancelText: { fontSize: 16, color: '#0984e3' },
  helperText: { fontSize: 13, color: '#7f8c8d', marginBottom: 16 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#dfe6e9',
  },
});
