export interface Profile {
  username: string;
  bio: string;
  image: string;
  location?: string;
  website?: string;
  following: boolean;
  followersCount: number;
  followingCount: number;
  totalArticlesCount: number;
}
