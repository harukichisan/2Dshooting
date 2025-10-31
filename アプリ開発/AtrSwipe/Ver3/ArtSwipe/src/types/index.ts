export interface ArtWork {
  id: number;
  title: string;
  artistDisplayName: string;
  objectDate: string;
  medium: string;
  department: string;
  culture: string;
  primaryImage: string;
  primaryImageSmall: string;
  additionalImages: string[];
  objectURL: string;
}

export interface SwipeDirection {
  type: 'like' | 'dislike' | 'later' | 'not-interested';
  direction: 'right' | 'left' | 'up' | 'down';
}
