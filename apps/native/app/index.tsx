import { useDb } from '@/providers/DbProvider';

import { selectActiveTrips, toggleFavouriteTrip } from '@/lib/trips';

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import React, { useState } from 'react';

import { router } from 'expo-router';

import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export default function TripListScreen() {
  const db = useDb();
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  const { data = [], error } = useLiveQuery(
    selectActiveTrips(db, { favouritesOnly }),
    [favouritesOnly],
  );

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>Could not load trips.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setFavouritesOnly((x) => !x)}
          style={[styles.filterChip, favouritesOnly && styles.filterChipOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: favouritesOnly }}
        >
          <Text style={favouritesOnly ? styles.filterChipLabelOn : styles.filterChipLabel}>
            Favorites only
          </Text>
        </Pressable>
      </View>
      <FlatList
        data={data}
        contentContainerStyle={data.length === 0 ? styles.emptyList : styles.listPad}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>Nothing logged yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap &quot;Add log&quot; above to capture your holiday or camping trips while offline — sync-ready outbox mutations are queued for later server sync.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => router.push(`/trip/${item.id}`)}
              >
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              </Pressable>
              <Pressable
                hitSlop={12}
                onPress={() => {
                  void toggleFavouriteTrip(db, item.id);
                }}
                accessibilityLabel={item.isFavourite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Text style={{ fontSize: 20 }}>
                  {item.isFavourite ? '♥' : '♡'}
                </Text>
              </Pressable>
            </View>
            <Pressable onPress={() => router.push(`/trip/${item.id}`)}>
              <Text style={styles.cardMeta}>
                {item.startDate} → {item.endDate}
              </Text>
              <Text style={styles.cardStars}>{stars(item.rating)}</Text>
              {item.placeName ? (
                <Text style={styles.cardPlace} numberOfLines={1}>{item.placeName}</Text>
              ) : null}
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listPad: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },
  emptyList: { flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: '#666', lineHeight: 22 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    backgroundColor: '#f8f8f8',
  },
  filterChipOn: { backgroundColor: '#007AFF26', borderColor: '#007AFF' },
  filterChipLabel: { color: '#333' },
  filterChipLabelOn: { color: '#007AFF', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e5e5',
    gap: 4,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  cardMeta: { color: '#555', fontSize: 14 },
  cardStars: { fontSize: 14, letterSpacing: 1, color: '#b8860b' },
  cardPlace: { color: '#777', fontSize: 13 },
});
