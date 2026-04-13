import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { analyzeProductImages } from './src/api/kimiApi';

const DEFAULT_API_KEY = 'sk-RP4MCNqAf9zvWJBoPyktFmmVVZhcPRjKbeAFffOVm1ROgDjG';

const { width } = Dimensions.get('window');
const MAX_IMAGES = 3;

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [images, setImages] = useState([]); // array of base64 strings
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (permission?.status !== 'granted') {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current && images.length < MAX_IMAGES) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (photo.base64) {
        setImages((prev) => [...prev, photo.base64]);
      }
    }
  };

  const pickFromGallery = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit reached', `You can only select up to ${MAX_IMAGES} images.`);
      return;
    }
    const resultPicker = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });
    if (!resultPicker.canceled && resultPicker.assets?.[0]?.base64) {
      setImages((prev) => [...prev, resultPicker.assets[0].base64]);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    const keyToUse = apiKey.trim() || DEFAULT_API_KEY;
    if (!keyToUse) {
      Alert.alert('Missing API Key', 'Please enter your Kimi API key.');
      return;
    }
    if (images.length === 0) {
      Alert.alert('No Images', 'Please capture or select at least one product image.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeProductImages(images, keyToUse);
      setResult(data);
    } catch (err) {
      Alert.alert('Analysis Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImages([]);
    setResult(null);
    setShowCamera(false);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera Permission Required</Text>
        <Text style={styles.subtitle}>We need camera access to scan products.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Product Scanner</Text>
        <Text style={styles.subheader}>Capture 1-{MAX_IMAGES} images of a product and let AI extract details.</Text>

        {/* API Key Input */}
        <View style={styles.card}>
          <Text style={styles.label}>Kimi API Key</Text>
          <TextInput
            style={styles.input}
            placeholder="sk-..."
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>

        {/* Camera Preview */}
        {showCamera ? (
          <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} ref={cameraRef}>
              <View style={styles.cameraOverlay}>
                <Text style={styles.cameraText}>{images.length}/{MAX_IMAGES} captured</Text>
              </View>
            </CameraView>
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={images.length >= MAX_IMAGES}>
                <View style={[styles.captureInner, images.length >= MAX_IMAGES && { backgroundColor: '#ccc' }]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeCameraButton} onPress={() => setShowCamera(false)}>
                <Text style={styles.buttonText}>Close Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={() => setShowCamera(true)}>
            <Text style={styles.buttonText}>Open Camera</Text>
          </TouchableOpacity>
        )}

        {/* Gallery Button */}
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={pickFromGallery}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Pick from Gallery</Text>
        </TouchableOpacity>

        {/* Captured Images */}
        {images.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>Captured Images ({images.length}/{MAX_IMAGES})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {images.map((img, idx) => (
                <View key={idx} style={styles.imageWrapper}>
                  <Image source={{ uri: `data:image/jpeg;base64,${img}` }} style={styles.thumbnail} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(idx)}>
                    <Text style={styles.removeBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Analyze Button */}
        <TouchableOpacity
          style={[styles.button, styles.analyzeButton, (loading || images.length === 0) && { opacity: 0.6 }]}
          onPress={analyzeImages}
          disabled={loading || images.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Analyze with Kimi K2.5</Text>
          )}
        </TouchableOpacity>

        {/* Reset */}
        <TouchableOpacity style={[styles.button, styles.ghostButton]} onPress={reset}>
          <Text style={[styles.buttonText, styles.ghostButtonText]}>Reset All</Text>
        </TouchableOpacity>

        {/* Results */}
        {result && (
          <View style={[styles.card, styles.resultCard]}>
            <Text style={styles.label}>Product Details</Text>
            {Object.entries(result).map(([key, value]) => (
              <View key={key} style={styles.resultRow}>
                <Text style={styles.resultKey}>{formatKey(key)}</Text>
                <Text style={styles.resultValue}>{value ?? 'N/A'}</Text>
              </View>
            ))}
            <Text style={styles.rawLabel}>Raw JSON:</Text>
            <Text style={styles.rawJson}>{JSON.stringify(result, null, 2)}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatKey(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f6fa',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
    color: '#2c3e50',
  },
  subheader: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#34495e',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
  },
  button: {
    backgroundColor: '#0984e3',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#dfe6e9',
  },
  secondaryButtonText: {
    color: '#2c3e50',
  },
  analyzeButton: {
    backgroundColor: '#00b894',
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#b2bec3',
  },
  ghostButtonText: {
    color: '#636e72',
  },
  cameraContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#000',
  },
  camera: {
    width: width - 32,
    height: (width - 32) * 1.25,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cameraText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#000',
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ff4757',
  },
  closeCameraButton: {
    backgroundColor: '#2f3542',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  imageScroll: {
    marginTop: 4,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#dfe6e9',
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff4757',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  resultCard: {
    marginTop: 8,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  resultKey: {
    fontSize: 13,
    fontWeight: '600',
    color: '#576574',
    flex: 1,
  },
  resultValue: {
    fontSize: 13,
    color: '#2f3542',
    flex: 1.2,
    textAlign: 'right',
  },
  rawLabel: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '700',
    color: '#747d8c',
  },
  rawJson: {
    marginTop: 6,
    fontSize: 11,
    color: '#576574',
    fontFamily: 'monospace',
    backgroundColor: '#f1f2f6',
    padding: 10,
    borderRadius: 6,
  },
});
