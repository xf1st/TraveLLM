import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import type { Trip, DayPlan, Activity } from '../../lib/types';
import { CITY_COORDS } from '../../lib/types';

const { width, height } = Dimensions.get('window');

interface MapPlace {
  id: string;
  name: string;
  description: string;
  coords: [number, number];
  day: number;
  tripId: string;
  tripTitle: string;
  category?: string;
}

// Dark map style for Android/Google Maps
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
];

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('trips')
        .select('id, title, destination, itinerary')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setTrips(data as Trip[]);
        extractPlaces(data as Trip[]);
      }
    } catch (e) {
      console.error('Error loading trips for map:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const extractPlaces = (tripsData: Trip[]) => {
    const allPlaces: MapPlace[] = [];
    tripsData.forEach(trip => {
      if (!Array.isArray(trip.itinerary)) return;
      (trip.itinerary as DayPlan[]).forEach(day => {
        day.activities?.forEach((activity: Activity, index: number) => {
          if (activity.coords) {
            allPlaces.push({
              id: `${trip.id}-${day.day}-${index}`,
              name: activity.placeName,
              description: activity.desc,
              coords: activity.coords,
              day: day.day,
              tripId: trip.id,
              tripTitle: trip.title || trip.destination,
              category: activity.category,
            });
          }
        });

        // Try to get coords from city name as fallback
        if (day.title && !day.activities?.some(a => a.coords)) {
          for (const [city, coords] of Object.entries(CITY_COORDS)) {
            if (day.title.includes(city)) {
              allPlaces.push({
                id: `${trip.id}-${day.day}-city`,
                name: city,
                description: day.title,
                coords,
                day: day.day,
                tripId: trip.id,
                tripTitle: trip.title || trip.destination,
              });
              break;
            }
          }
        }
      });
    });
    setPlaces(allPlaces);
  };

  const filteredPlaces = selectedTrip
    ? places.filter(p => p.tripId === selectedTrip)
    : places;

  const focusOnPlace = (place: MapPlace) => {
    setSelectedPlace(place);
    mapRef.current?.animateToRegion({
      latitude: place.coords[0],
      longitude: place.coords[1],
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 500);
  };

  const getCategoryIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'museum': return 'business-outline';
      case 'food': return 'restaurant-outline';
      case 'nature': return 'leaf-outline';
      case 'beach': return 'sunny-outline';
      case 'shopping': return 'bag-outline';
      case 'nightlife': return 'moon-outline';
      default: return 'location-outline';
    }
  };

  const getMarkerColor = (day: number) => {
    const palette = ['#7CB9D4', '#FF6B6B', '#4CAF50', '#FFA726', '#AB47BC', '#26C6DA', '#EF5350', '#66BB6A'];
    return palette[day % palette.length];
  };

  const initialRegion: Region = {
    latitude: 55.7558,
    longitude: 37.6173,
    latitudeDelta: 30,
    longitudeDelta: 30,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {filteredPlaces.map(place => (
          <Marker
            key={place.id}
            coordinate={{
              latitude: place.coords[0],
              longitude: place.coords[1],
            }}
            title={place.name}
            description={place.description}
            pinColor={getMarkerColor(place.day)}
            onPress={() => setSelectedPlace(place)}
          />
        ))}
      </MapView>

      {/* Top overlay: Trip filter */}
      <SafeAreaView style={styles.topOverlay} edges={['top']}>
        <View style={styles.topBar}>
          <Text style={[styles.topTitle, { color: '#fff' }]}>Карта</Text>
          <Text style={[styles.topSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
            {filteredPlaces.length} мест
          </Text>
        </View>

        {trips.length > 0 && (
          <FlatList
            horizontal
            data={[{ id: null, title: 'Все', destination: '' }, ...trips]}
            keyExtractor={(item) => item.id || 'all'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: (selectedTrip === item.id || (selectedTrip === null && item.id === null))
                      ? 'rgba(124,185,212,0.9)'
                      : 'rgba(0,0,0,0.5)',
                  },
                ]}
                onPress={() => setSelectedTrip(item.id)}
              >
                <Text style={styles.filterChipText} numberOfLines={1}>
                  {item.title || item.destination || 'Все'}
                </Text>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>

      {/* My location button */}
      <Pressable
        style={[styles.myLocationButton, { backgroundColor: colors.card }]}
        onPress={() => {
          mapRef.current?.animateToRegion(initialRegion, 500);
        }}
      >
        <Ionicons name="locate-outline" size={22} color={colors.text} />
      </Pressable>

      {/* Selected place card */}
      {selectedPlace && (
        <View style={[styles.placeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.placeCardHeader}>
            <View style={[styles.placeIcon, { backgroundColor: `${getMarkerColor(selectedPlace.day)}20` }]}>
              <Ionicons name={getCategoryIcon(selectedPlace.category)} size={20} color={getMarkerColor(selectedPlace.day)} />
            </View>
            <View style={styles.placeCardInfo}>
              <Text style={[styles.placeName, { color: colors.text }]} numberOfLines={1}>
                {selectedPlace.name}
              </Text>
              <Text style={[styles.placeTrip, { color: colors.textSecondary }]} numberOfLines={1}>
                {selectedPlace.tripTitle} · День {selectedPlace.day}
              </Text>
            </View>
            <Pressable onPress={() => setSelectedPlace(null)}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={[styles.placeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {selectedPlace.description}
          </Text>
          <Pressable
            style={styles.placeAction}
            onPress={() => router.push(`/trip/${selectedPlace.tripId}`)}
          >
            <Text style={styles.placeActionText}>Открыть маршрут</Text>
            <Ionicons name="arrow-forward" size={16} color="#7CB9D4" />
          </Pressable>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#7CB9D4" />
        </View>
      )}

      {/* Empty state */}
      {!loading && places.length === 0 && (
        <View style={styles.emptyOverlay}>
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="map-outline" size={36} color="#7CB9D4" />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Карта пуста
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Создайте маршрут, и все места{'\n'}появятся на карте
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  // Top overlay
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  topSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    maxWidth: 160,
  },
  filterChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Location button
  myLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 180,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  // Place card
  placeCard: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  placeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeCardInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
  },
  placeTrip: {
    fontSize: 12,
    marginTop: 2,
  },
  placeDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  placeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeActionText: {
    color: '#7CB9D4',
    fontSize: 14,
    fontWeight: '600',
  },
  // Loading & Empty
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  emptyOverlay: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
});
