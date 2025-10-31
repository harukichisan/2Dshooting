import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SwipeCard } from './src/components/SwipeCard';
import { fetchArtworks } from './src/services/artApi';
import { addToFavorites, addToLater } from './src/utils/storage';
import { ArtWork } from './src/types';

export default function App() {
  const [artworks, setArtworks] = useState<ArtWork[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(0);

  useEffect(() => {
    loadArtworks();
  }, []);

  const loadArtworks = async () => {
    setLoading(true);
    const data = await fetchArtworks(20);
    setArtworks(data);
    setLoading(false);
  };

  const handleSwipe = async (direction: 'left' | 'right' | 'up' | 'down') => {
    const currentArtwork = artworks[currentIndex];
    
    if (!currentArtwork) return;

    // スワイプの方向に応じて処理
    switch (direction) {
      case 'right':
        // お気に入りに追加
        await addToFavorites(currentArtwork);
        setFavorites(prev => prev + 1);
        console.log('❤️ Liked:', currentArtwork.title);
        break;
      case 'left':
        // スキップ
        console.log('👎 Nope:', currentArtwork.title);
        break;
      case 'up':
        // 後で見る
        await addToLater(currentArtwork);
        console.log('⏰ Save for later:', currentArtwork.title);
        break;
      case 'down':
        // 興味なし
        console.log('🚫 Not interested:', currentArtwork.title);
        break;
    }

    // 次のカードへ
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    // 残り3枚になったら追加読み込み
    if (nextIndex >= artworks.length - 3) {
      const newArtworks = await fetchArtworks(10);
      setArtworks([...artworks, ...newArtworks]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading artworks...</Text>
      </View>
    );
  }

  if (artworks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No artworks available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadArtworks}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.logo}>🎨 ArtSwipe</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>❤️ {favorites}</Text>
        </View>
      </View>

      {/* スワイプ可能なカード */}
      <View style={styles.cardContainer}>
        {artworks.slice(currentIndex, currentIndex + 3).map((artwork, index) => (
          <SwipeCard
            key={artwork.id}
            artwork={artwork}
            onSwipe={handleSwipe}
            isTop={index === 0}
          />
        )).reverse()}
      </View>

      {/* 操作ガイド */}
      <View style={styles.guideContainer}>
        <View style={styles.guideItem}>
          <Text style={styles.guideIcon}>←</Text>
          <Text style={styles.guideText}>Nope</Text>
        </View>
        <View style={styles.guideItem}>
          <Text style={styles.guideIcon}>↑</Text>
          <Text style={styles.guideText}>Later</Text>
        </View>
        <View style={styles.guideItem}>
          <Text style={styles.guideIcon}>→</Text>
          <Text style={styles.guideText}>Like</Text>
        </View>
        <View style={styles.guideItem}>
          <Text style={styles.guideIcon}>↓</Text>
          <Text style={styles.guideText}>Not interested</Text>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  statsText: {
    fontSize: 18,
    color: '#666',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  guideItem: {
    alignItems: 'center',
  },
  guideIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  guideText: {
    fontSize: 12,
    color: '#666',
  },
});
