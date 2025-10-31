import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArtWork } from '../types';

const FAVORITES_KEY = '@artswipe_favorites';
const LATER_KEY = '@artswipe_later';

// お気に入りに追加
export const addToFavorites = async (artwork: ArtWork): Promise<void> => {
  try {
    const existing = await getFavorites();
    const filtered = existing.filter(item => item.id !== artwork.id);
    const updated = [artwork, ...filtered];
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving to favorites:', error);
  }
};

// お気に入り一覧を取得
export const getFavorites = async (): Promise<ArtWork[]> => {
  try {
    const data = await AsyncStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

// 後で見るに追加
export const addToLater = async (artwork: ArtWork): Promise<void> => {
  try {
    const existing = await getLater();
    const filtered = existing.filter(item => item.id !== artwork.id);
    const updated = [artwork, ...filtered];
    await AsyncStorage.setItem(LATER_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving to later:', error);
  }
};

// 後で見る一覧を取得
export const getLater = async (): Promise<ArtWork[]> => {
  try {
    const data = await AsyncStorage.getItem(LATER_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting later:', error);
    return [];
  }
};

// お気に入りから削除
export const removeFromFavorites = async (artworkId: number): Promise<void> => {
  try {
    const existing = await getFavorites();
    const updated = existing.filter(item => item.id !== artworkId);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error removing from favorites:', error);
  }
};
