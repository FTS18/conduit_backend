import { User } from '../auth/user.model';
import { Profile } from './profile.model';

const profileMapper = (user: any, id: number | undefined): Profile => ({
  username: user.username,
  bio: user.bio,
  image: user.image,
  following: id
    ? user?.followedBy.some((followingUser: Partial<User>) => followingUser.id === id)
    : false,
  followersCount: user._count?.followedBy || 0,
  followingCount: user._count?.following || 0,
  totalArticlesCount: user._count?.articles || 0,
});

export default profileMapper;
