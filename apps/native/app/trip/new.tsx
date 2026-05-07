import { tripInputSchema } from '@camp-log/contracts';

import { createTripRecord } from '@/lib/trips';

import { useDb } from '@/providers/DbProvider';

import * as ImagePicker from 'expo-image-picker';

import * as Location from 'expo-location';

import { router } from 'expo-router';

import React, { useEffect, useState } from 'react';

import {

  Alert,

  Dimensions,

  Image,

  KeyboardAvoidingView,

  Platform,

  Pressable,

  ScrollView,

  StyleSheet,

  Switch,

  Text,

  TextInput,

  View,

} from 'react-native';

import MapView, { Marker } from 'react-native-maps';

const DAY = () => new Date().toISOString().slice(0, 10);

export default function NewTripScreen() {
  const db = useDb();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(DAY);
  const [endDate, setEndDate] = useState(DAY);
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [rating, setRating] = useState(4);
  const [isFavourite, setIsFavourite] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [coordinate, setCoordinate] = useState<{ latitude: number; longitude: number }>(
    { latitude: 51.5074, longitude: -0.1278 },
  );
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setCoordinate({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach trip shots stored only on-device.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.85,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      selectionLimit: 12,
    });

    if (res.canceled) return;
    setPhotoUris((prev) => [...prev, ...res.assets.map((a) => a.uri)]);
  };

  const onSave = async () => {
    const tagNames = tagsText.split(',').map((s) => s.trim()).filter(Boolean);

    const payload = tripInputSchema.safeParse({
      title,
      startDate,
      endDate,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      placeName: placeName || null,
      notes,
      rating,
      isFavourite,
      tagNames,
    });

    if (!payload.success) {
      Alert.alert('Check your fields', 'Title and dates must be valid.');
      return;
    }

    setSaving(true);
    try {
      await createTripRecord(db, payload.data, photoUris);
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Could not save', 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  const mapHeight = Math.min(220, Dimensions.get('window').height * 0.26);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pad}>
        <Text style={styles.label}>Title</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Summer lake weekend" />

        <Text style={styles.label}>Date range</Text>
        <View style={styles.row}>
          <TextInput value={startDate} onChangeText={setStartDate} style={[styles.input, styles.half]} />
          <TextInput value={endDate} onChangeText={setEndDate} style={[styles.input, styles.half]} />
        </View>
        <Text style={styles.hint}>Format YYYY-MM-DD</Text>

        <Text style={styles.label}>Place name</Text>
        <TextInput value={placeName} onChangeText={setPlaceName} style={styles.input} placeholder="Optional label" />

        <Text style={styles.label}>Map pin</Text>
        {Platform.OS === 'web' ? (
          <Text style={styles.webMapNote}>Embedded maps ship in native Android and iOS builds.</Text>
        ) : (
          <MapView
            style={{ width: '100%', height: mapHeight, borderRadius: 12 }}
            region={{
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
          >
            <Marker
              draggable
              coordinate={coordinate}
              onDragEnd={(e) => setCoordinate(e.nativeEvent.coordinate)}
            />
          </MapView>
        )}

        <Text style={styles.label}>Rating</Text>
        <View style={styles.row}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} style={styles.starBtn}>
              <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.row, styles.spaceBetween]}>
          <Text style={styles.labelFlat}>Favorite</Text>
          <Switch value={isFavourite} onValueChange={setIsFavourite} />
        </View>

        <Text style={styles.label}>Tags</Text>
        <TextInput
          style={styles.input}
          placeholder="comma, separated"
          value={tagsText}
          onChangeText={setTagsText}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          multiline
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Gear, campfire recipes, campsite number…"
          textAlignVertical="top"
        />

        <Text style={styles.label}>Photos ({photoUris.length})</Text>
        <Pressable style={styles.secondaryBtn} onPress={pickPhotos}>
          <Text style={styles.secondaryBtnLabel}>Add from library</Text>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={styles.photoRow}>
            {photoUris.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.thumb} />
            ))}
          </View>
        </ScrollView>

        <Pressable
          style={[styles.primaryBtn, saving && { opacity: 0.65 }]}
          onPress={() => void onSave()}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text style={styles.primaryLabel}>{saving ? 'Saving…' : 'Save trip log'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40, gap: 10 },
  label: { marginTop: 6, fontWeight: '600' },
  labelFlat: { fontWeight: '600' },
  hint: { color: '#888', fontSize: 12 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  notes: { minHeight: 120 },
  row: { flexDirection: 'row', gap: 10 },
  spaceBetween: { alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },
  half: { flex: 1 },
  starBtn: { paddingHorizontal: 4 },
  star: { fontSize: 32, color: '#ddd' },
  starOn: { color: '#d4af37' },
  primaryBtn: {
    marginTop: 22,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnLabel: { color: '#007AFF', fontWeight: '600' },
  photoRow: { flexDirection: 'row', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  webMapNote: { color: '#666', fontStyle: 'italic' },
});
