import prisma from '../../../prisma/prisma-client';

export const getNotifications = async (userId: number) => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    include: {
      fromUser: {
        select: {
          username: true,
          image: true,
          bio: true,
        },
      },
      comment: {
        include: {
          article: {
            select: {
              slug: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 30,
  });

  return notifications;
};

export const markNotificationAsRead = async (notificationId: number, userId: number) => {
  const notification = await prisma.notification.findUnique({
    where: {
      id: notificationId,
    },
  });

  if (!notification || notification.userId !== userId) {
    throw new Error('Notification not found');
  }

  return await prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      read: true,
    },
  });
};

export const getUnreadCount = async (userId: number) => {
  const count = await prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });

  return count;
};
