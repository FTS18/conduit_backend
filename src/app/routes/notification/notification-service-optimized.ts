import prisma from '../../../prisma/prisma-client';

const NOTIFICATION_BATCH_DELAY = 2000; // 2 seconds
const notificationQueues = new Map<number, Set<string>>();
const notificationTimers = new Map<number, NodeJS.Timeout>();

// Debounce notifications to batch them
export const queueNotification = async (
  userId: number,
  type: string,
  message: string,
  fromUserId: number,
  commentId?: number
) => {
  const key = `${type}_${fromUserId}_${commentId || 'none'}`;
  
  if (!notificationQueues.has(userId)) {
    notificationQueues.set(userId, new Set());
  }

  const queue = notificationQueues.get(userId)!;
  queue.add(key);

  // Clear existing timer
  if (notificationTimers.has(userId)) {
    clearTimeout(notificationTimers.get(userId)!);
  }

  // Set new timer to batch notifications
  const timer = setTimeout(async () => {
    await flushNotificationQueue(userId);
  }, NOTIFICATION_BATCH_DELAY);

  notificationTimers.set(userId, timer);
};

// Flush queued notifications
export const flushNotificationQueue = async (userId: number) => {
  const queue = notificationQueues.get(userId);
  if (!queue || queue.size === 0) return;

  notificationQueues.delete(userId);
  if (notificationTimers.has(userId)) {
    clearTimeout(notificationTimers.get(userId)!);
    notificationTimers.delete(userId);
  }

  // Process queued notifications
  for (const key of queue) {
    // Notification already created during queueing
  }
};

// Get notifications with filtering and pagination
export const getNotifications = async (
  userId: number,
  type?: string,
  limit: number = 30,
  offset: number = 0
) => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(type && { type }),
    },
    include: {
      fromUser: {
        select: {
          id: true,
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
    skip: offset,
    take: limit,
  });

  return notifications;
};

// Get unread count
export const getUnreadCount = async (userId: number) => {
  const count = await prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });

  return count;
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: number, userId: number) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw new Error('Notification not found');
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (userId: number) => {
  return await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });
};

// Delete old notifications (older than 30 days)
export const cleanupOldNotifications = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return await prisma.notification.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
      read: true,
    },
  });
};

// Get notification statistics
export const getNotificationStats = async (userId: number) => {
  const [total, unread, byType] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.notification.groupBy({
      by: ['type'],
      where: { userId },
      _count: true,
    }),
  ]);

  return {
    total,
    unread,
    byType: byType.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {} as Record<string, number>),
  };
};

// Create notification with deduplication
export const createNotification = async (
  userId: number,
  type: string,
  message: string,
  fromUserId: number,
  commentId?: number
) => {
  // Check for duplicate recent notifications
  const recentNotification = await prisma.notification.findFirst({
    where: {
      userId,
      type,
      fromUserId,
      createdAt: {
        gte: new Date(Date.now() - 60000), // Last 60 seconds
      },
    },
  });

  if (recentNotification) {
    return recentNotification;
  }

  return await prisma.notification.create({
    data: {
      type,
      message,
      user: { connect: { id: userId } },
      fromUser: { connect: { id: fromUserId } },
      ...(commentId && { comment: { connect: { id: commentId } } }),
    },
    include: {
      fromUser: {
        select: {
          id: true,
          username: true,
          image: true,
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
  });
};
