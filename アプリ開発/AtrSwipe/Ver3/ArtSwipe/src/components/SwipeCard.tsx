import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { ArtWork } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

interface SwipeCardProps {
  artwork: ArtWork;
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void;
  isTop: boolean;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({ artwork, onSwipe, isTop }) => {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;
  const rotate = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-30deg', '0deg', '30deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === 4) { // ACTIVE state
      const { translationX, translationY } = event.nativeEvent;
      
      let direction: 'left' | 'right' | 'up' | 'down' | null = null;
      
      // 横方向のスワイプ判定
      if (Math.abs(translationX) > Math.abs(translationY)) {
        if (translationX > SWIPE_THRESHOLD) {
          direction = 'right';
        } else if (translationX < -SWIPE_THRESHOLD) {
          direction = 'left';
        }
      } 
      // 縦方向のスワイプ判定
      else {
        if (translationY < -SWIPE_THRESHOLD) {
          direction = 'up';
        } else if (translationY > SWIPE_THRESHOLD) {
          direction = 'down';
        }
      }

      if (direction) {
        // スワイプアニメーション
        Animated.timing(direction === 'right' || direction === 'left' ? translateX : translateY, {
          toValue: direction === 'right' ? SCREEN_WIDTH * 1.5 : 
                   direction === 'left' ? -SCREEN_WIDTH * 1.5 :
                   direction === 'up' ? -SCREEN_HEIGHT * 1.5 :
                   SCREEN_HEIGHT * 1.5,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onSwipe(direction as 'left' | 'right' | 'up' | 'down');
        });
      } else {
        // 元に戻すアニメーション
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 5,
        }).start();
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 5,
        }).start();
      }
    }
  };

  const animatedStyle = {
    transform: [
      { translateX },
      { translateY },
      { rotate },
    ],
  };

  return (
    <View style={styles.cardContainer} pointerEvents={isTop ? 'auto' : 'none'}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View style={[styles.card, animatedStyle]}>
          <Image
            source={{ uri: artwork.primaryImage }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* LIKE ラベル */}
          <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
            <Text style={styles.likeLabelText}>LIKE</Text>
          </Animated.View>
          
          {/* NOPE ラベル */}
          <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
            <Text style={styles.nopeLabelText}>NOPE</Text>
          </Animated.View>
          
          {/* 作品情報 */}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {artwork.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {artwork.artistDisplayName}
            </Text>
            <Text style={styles.date}>{artwork.objectDate}</Text>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  card: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT - 200,
    backgroundColor: 'white',
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '75%',
  },
  infoContainer: {
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  artist: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  likeLabel: {
    position: 'absolute',
    top: 50,
    left: 40,
    borderWidth: 4,
    borderColor: '#4CAF50',
    borderRadius: 8,
    padding: 10,
    transform: [{ rotate: '-20deg' }],
  },
  likeLabelText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  nopeLabel: {
    position: 'absolute',
    top: 50,
    right: 40,
    borderWidth: 4,
    borderColor: '#F44336',
    borderRadius: 8,
    padding: 10,
    transform: [{ rotate: '20deg' }],
  },
  nopeLabelText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F44336',
  },
});
