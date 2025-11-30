import prisma from '../../../prisma/prisma-client';
import profileMapper from './profile.utils';
import HttpException from '../../models/http-exception.model';

export const getProfile = async (usernamePayload: string, id?: number) => {
  const profile = await prisma.user.findUnique({
    where: {
      username: usernamePayload,
    },
    include: {
      followedBy: true,
      _count: {
        select: {
          followedBy: true,
          following: true,
          articles: true,
        },
      },
    },
  });

  if (!profile) {
    throw new HttpException(404, {});
  }

  return profileMapper(profile, id);
};

export const getFollowers = async (usernamePayload: string, id?: number) => {
  const user = await prisma.user.findUnique({
    where: {
      username: usernamePayload,
    },
    include: {
      followedBy: {
        select: {
          id: true,
          username: true,
          bio: true,
          image: true,
          followedBy: true,
        },
      },
    },
  });

  if (!user) {
    throw new HttpException(404, {});
  }

  return user.followedBy.map(follower => profileMapper(follower, id));
};

export const getFollowing = async (usernamePayload: string, id?: number) => {
  const user = await prisma.user.findUnique({
    where: {
      username: usernamePayload,
    },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          bio: true,
          image: true,
          followedBy: true,
        },
      },
    },
  });

  if (!user) {
    throw new HttpException(404, {});
  }

  return user.following.map(followedUser => profileMapper(followedUser, id));
};

export const followUser = async (usernamePayload: string, id: number) => {
  const profile = await prisma.user.update({
    where: {
      username: usernamePayload,
    },
    data: {
      followedBy: {
        connect: {
          id,
        },
      },
    },
    include: {
      followedBy: true,
      _count: {
        select: {
          followedBy: true,
          following: true,
          articles: true,
        },
      },
    },
  });

  if (profile.id !== id) {
    await prisma.notification.create({
      data: {
        type: 'follow',
        message: 'started following you',
        user: {
          connect: {
            id: profile.id,
          },
        },
        fromUser: {
          connect: {
            id,
          },
        },
      },
    });
  }

  return profileMapper(profile, id);
};

export const unfollowUser = async (usernamePayload: string, id: number) => {
  const profile = await prisma.user.update({
    where: {
      username: usernamePayload,
    },
    data: {
      followedBy: {
        disconnect: {
          id,
        },
      },
    },
    include: {
      followedBy: true,
      _count: {
        select: {
          followedBy: true,
          following: true,
          articles: true,
        },
      },
    },
  });

  return profileMapper(profile, id);
};
