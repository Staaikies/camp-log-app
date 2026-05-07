import * as schema from '@/db/schema';

import { softDeleteTrip, toggleFavouriteTrip } from '@/lib/trips';

import { useDb } from '@/providers/DbProvider';

import { eq } from 'drizzle-orm';

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { router, useLocalSearchParams } from 'expo-router';

import React from 'react';

import {
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import MapView, { Marker } from 'react-native-maps';

function stars(n: number) {
  const r = Math.max(1, Math.min(5, n));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

export default function TripDetailScreen() {
  const raw = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = typeof raw === 'string' ? raw : raw?.[0] ?? '';
  const db = useDb();

  const { data: tripRows = [] } = useLiveQuery(
    db.select().from(schema.trips).where(eq(schema.trips.id, id)),
  );
  const trip = tripRows[0];

  const { data: photoRows = [] } = useLiveQuery(
    db
      .select()
      .from(schema.tripPhotos)
      .where(
        eq(
          schema.tripPhotos.tripId,
          id || '00000000-0000-0000-0000-000000000000',
        ),
      ),
  );

  if (!id || !trip) {
    return (
      <View style={styles.centered}>
        <Text>Trip missing</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backLbl}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (trip.deletedAt) {
    return (
      <View style={styles.centered}>
        <Text>This trip has been archived locally.</Text>
      </View>
    );
  }

  const coords =
    trip.latitude != null && trip.longitude != null
      ? { latitude: trip.latitude, longitude: trip.longitude }
      : null;

  const mapHeight = Math.min(200, Dimensions.get('window').height * 0.22);
  const photos = [...photoRows].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.title}>{trip.title}</Text>

      <View style={styles.row}>
        <Text style={styles.meta}>
          {trip.startDate} → {trip.endDate}
        </Text>
        <Pressable onPress={() => void toggleFavouriteTrip(db, trip.id)}>
          <Text style={{ fontSize: 26 }}>{trip.isFavourite ? '♥' : '♡'}</Text>
        </Pressable>
      </View>

      <Text style={styles.stars}>{stars(trip.rating)}</Text>
      {trip.placeName ? <Text style={styles.place}>{trip.placeName}</Text> : null}

      <Text style={styles.syncHint}>Sync status: {trip.syncStatus}</Text>

      {coords && Platform.OS !== 'web' ? (
        <>
          <Text style={styles.section}>Pinned location</Text>
          <MapView
            style={{ width: '100%', height: mapHeight, borderRadius: 12 }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            region={{
              ...coords,
              latitudeDelta: 0.06,
              longitudeDelta: 0.06,
            }}
          >
            <Marker coordinate={coords} />
          </MapView>
        </>
      ) : null}

      {trip.notes ? (
        <>
          <Text style={styles.section}>Notes</Text>
          <Text style={styles.notes}>{trip.notes}</Text>
        </>
      ) : null}

      {photos.length ? (
        <>
          <Text style={styles.section}>Photos</Text>
          <ScrollView horizontal>
            <View style={styles.photoRow}>
              {photos.map((ph) => (
                <Image key={ph.id} source={{ uri: ph.localUri }} style={styles.thumb} />
              ))}
            </View>
          </ScrollView>
        </>
      ) : null}

      <Pressable
        style={styles.danger}
        onPress={() => {
          Alert.alert(
            'Archive trip?',
            'Removes from your timeline locally; eventual server sync repeats the delete.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Archive',
                style: 'destructive',
                onPress: async () => {
                  await softDeleteTrip(db, trip.id);
                  router.back();
                },
              },
            ],
          );
        }}
      >
        <Text style={styles.dangerTxt}>Archive trip</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  pad: { padding: 18, gap: 8, paddingBottom: 56 },
  title: { fontSize: 24, fontWeight: '700' },
  meta: { color: '#555', flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stars: { fontSize: 18, color: '#b8860b', letterSpacing: 1 },
  place: { fontSize: 15, color: '#555' },
  syncHint: { fontSize: 13, color: '#888', marginVertical: 8 },
  section: { marginTop: 16, marginBottom: 6, fontWeight: '700' },
  notes: { lineHeight: 22, fontSize: 16 },
  photoRow: { flexDirection: 'row', gap: 10 },
  thumb: { width: 104, height: 104, borderRadius: 10 },
  danger: {
    marginTop: 36,
    borderWidth: 1,
    borderColor: '#c00',
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  dangerTxt: { color: '#c00', fontWeight: '600' },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  backLbl: { fontWeight: '600' },
});
