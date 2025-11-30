import prisma from '../../../prisma/prisma-client';
import generateToken from './token.utils';
import HttpException from '../../models/http-exception.model';

export const syncSupabaseUser = async (supabaseUser: any) => {
  const { id: supabaseId, email, user_metadata } = supabaseUser;
  
  if (!email) {
    throw new HttpException(422, { errors: { email: ['Email is required'] } });
  }

  let user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      bio: true,
      image: true,
    },
  });

  if (!user) {
    const username = user_metadata?.name?.replace(/\s+/g, '_').toLowerCase() || email.split('@')[0];
    
    user = await prisma.user.create({
      data: {
        email,
        username,
        bio: user_metadata?.bio || '',
        image: user_metadata?.avatar_url || '',
        password: '',
      },
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        image: true,
      },
    });
  }

  return {
    ...user,
    token: generateToken(user.id),
  };
};
