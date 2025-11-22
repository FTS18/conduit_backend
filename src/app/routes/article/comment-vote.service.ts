import prisma from '../../../prisma/prisma-client';

export const voteComment = async (userId: number, commentId: number, value: number) => {
  const existingVote = await prisma.commentVote.findUnique({
    where: { commentId_userId: { commentId, userId } }
  });

  if (existingVote) {
    if (existingVote.value === value) {
      await prisma.commentVote.delete({
        where: { commentId_userId: { commentId, userId } }
      });
      return null;
    }
    return await prisma.commentVote.update({
      where: { commentId_userId: { commentId, userId } },
      data: { value }
    });
  }

  return await prisma.commentVote.create({
    data: { userId, commentId, value }
  });
};

export const getCommentVotes = async (commentId: number) => {
  const votes = await prisma.commentVote.findMany({
    where: { commentId }
  });
  return votes.reduce((sum, vote) => sum + vote.value, 0);
};

export const getUserVote = async (userId: number, commentId: number) => {
  const vote = await prisma.commentVote.findUnique({
    where: { commentId_userId: { commentId, userId } }
  });
  return vote?.value || 0;
};
