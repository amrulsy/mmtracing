import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/db';
import { env } from '../../config/env';
import { UnauthorizedError, NotFoundError } from '../../shared/errors';
import { LoginInput } from './auth.schema';

export class AuthService {
  async login(input: LoginInput) {
    const user = await db.queryOne<{
      id: number; name: string; username: string; email: string | null;
      password: string; status: string; avatar: string | null;
      roleId: number; roleName: string;
    }>(
      `SELECT u.*, r.name AS roleName
       FROM users u JOIN roles r ON r.id = u.roleId
       WHERE u.username = ? OR u.email = ? LIMIT 1`,
      [input.username, input.username],
    );

    if (!user) throw new UnauthorizedError('Username atau password salah');
    if (user.status !== 'aktif') throw new UnauthorizedError('Akun tidak aktif');

    const validPassword = await bcrypt.compare(input.password, user.password);
    if (!validPassword) throw new UnauthorizedError('Username atau password salah');

    // Update last login
    await db.update('users', { lastLogin: new Date() }, 'id = ?', [user.id]);

    // Log activity
    await db.insert('activity_logs', {
      userId: user.id,
      action: 'login',
      module: 'auth',
      targetName: user.name,
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
        role: user.roleName,
        avatar: user.avatar,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await db.queryOne<{
      id: number; name: string; username: string; email: string | null;
      avatar: string | null; lastLogin: Date | null; roleName: string;
    }>(
      `SELECT u.id, u.name, u.username, u.email, u.avatar, u.lastLogin,
              r.name AS roleName
       FROM users u JOIN roles r ON r.id = u.roleId
       WHERE u.id = ?`,
      [userId],
    );
    if (!user) throw new NotFoundError('User');
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.roleName,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
    };
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await db.queryOne<{ id: number; password: string }>(
      'SELECT id, password FROM users WHERE id = ?', [userId],
    );
    if (!user) throw new NotFoundError('User');

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) throw new UnauthorizedError('Password lama salah');

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.update('users', { password: hashed }, 'id = ?', [userId]);
  }
}

export const authService = new AuthService();
