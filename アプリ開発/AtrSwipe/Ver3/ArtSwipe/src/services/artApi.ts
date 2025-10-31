import { ArtWork } from '../types';

const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

// Met Museumから高画質画像を持つ作品のIDを取得
export const getArtworkIds = async (): Promise<number[]> => {
  try {
    // ハイライト作品や検索結果から取得
    // 例: 絵画（painting）で検索
    const response = await fetch(
      `${MET_API_BASE}/search?hasImages=true&q=painting`
    );
    const data = await response.json();
    
    if (data.objectIDs && data.objectIDs.length > 0) {
      // ランダムに100件取得
      return data.objectIDs.slice(0, 100);
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching artwork IDs:', error);
    return [];
  }
};

// 特定のアート作品の詳細情報を取得
export const getArtworkDetails = async (objectId: number): Promise<ArtWork | null> => {
  try {
    const response = await fetch(`${MET_API_BASE}/objects/${objectId}`);
    const data = await response.json();
    
    // 画像が存在しない作品はスキップ
    if (!data.primaryImage || data.primaryImage === '') {
      return null;
    }
    
    const artwork: ArtWork = {
      id: data.objectID,
      title: data.title || 'Untitled',
      artistDisplayName: data.artistDisplayName || 'Unknown Artist',
      objectDate: data.objectDate || 'Date unknown',
      medium: data.medium || 'Medium unknown',
      department: data.department || '',
      culture: data.culture || '',
      primaryImage: data.primaryImage,
      primaryImageSmall: data.primaryImageSmall || data.primaryImage,
      additionalImages: data.additionalImages || [],
      objectURL: data.objectURL || '',
    };
    
    return artwork;
  } catch (error) {
    console.error('Error fetching artwork details:', error);
    return null;
  }
};

// 複数のアート作品を取得
export const fetchArtworks = async (count: number = 20): Promise<ArtWork[]> => {
  try {
    const ids = await getArtworkIds();
    
    if (ids.length === 0) {
      return [];
    }
    
    // ランダムに選択
    const shuffled = ids.sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, count);
    
    // 各IDの詳細を並行取得
    const artworkPromises = selectedIds.map(id => getArtworkDetails(id));
    const artworks = await Promise.all(artworkPromises);
    
    // nullを除外して返す
    return artworks.filter((artwork): artwork is ArtWork => artwork !== null);
  } catch (error) {
    console.error('Error fetching artworks:', error);
    return [];
  }
};
