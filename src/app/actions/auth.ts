'use server';

import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-recall-token-key-change-in-production-12345';
const COOKIE_NAME = 'recall_session';

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  passwordHashRaw: string,
  name: string
): Promise<AuthResponse> {
  try {
    if (!email || !passwordHashRaw || passwordHashRaw.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const emailNormalized = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existingUser) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordHashRaw, salt);

    // Create user and preferences
    const user = await db.user.create({
      data: {
        email: emailNormalized,
        passwordHash,
        name,
        preferences: {
          create: {
            theme: 'system',
            aiSummaries: true,
            resurfacingEnabled: true,
          },
        },
      },
    });

    // Sign JWT session token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    // Set HTTP-only secure cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error: error.message || 'An error occurred during registration.' };
  }
}

/**
 * Log in an existing user
 */
export async function loginUser(
  email: string,
  passwordHashRaw: string
): Promise<AuthResponse> {
  try {
    const emailNormalized = email.toLowerCase().trim();

    const user = await db.user.findUnique({
      where: { email: emailNormalized },
    });

    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const isMatch = await bcrypt.compare(passwordHashRaw, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: 'Invalid email or password.' };
    }

    // Sign JWT session token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'An error occurred during login.' };
  }
}

/**
 * Log out user (clear session cookie)
 */
export async function logoutUser(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return { success: true };
}

/**
 * Get currently logged-in user session
 */
export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(COOKIE_NAME);
    if (!tokenCookie) return null;

    const decoded = jwt.verify(tokenCookie.value, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        preferences: true,
      },
    });

    return user;
  } catch (error) {
    // Session token expired or invalid
    return null;
  }
}
