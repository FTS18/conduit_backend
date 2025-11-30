export interface Profile {
  username: string;
  bio: string;
  image: string;
  following: boolean;
  followersCount: number;
  followingCount: number;
  totalArticlesCount: number;
  createdAt: Date;
}
