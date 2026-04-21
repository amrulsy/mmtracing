import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { UnauthorizedError, NotFoundError } from '../../shared/errors';
import { LoginInput } from './auth.schema';

export class AuthService {
  async login(input: LoginInput) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: input.username },
          { email: input.username },
        ],
      },
      include: { role: true },
    });

    if (!user) throw new UnauthorizedError('Username atau password salah');
    if (user.status !== 'aktif') throw new UnauthorizedError('Akun tidak aktif');

    const validPassword = await bcrypt.compare(input.password, user.password);
    if (!validPassword) throw new UnauthorizedError('Username atau password salah');

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'login',
        module: 'auth',
        targetName: user.name,
      },
    });

    const token = jwt.sign({ userId: user.id }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    } as jwt.SignOptions);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role.name,
        avatar: user.avatar,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new NotFoundError('User');
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role.name,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
    };
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) throw new UnauthorizedError('Password lama salah');

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  }
}

export const authService = new AuthService();
