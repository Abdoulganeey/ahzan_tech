import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

const ADMIN_EMAIL_ALLOWLIST = new Set([
  'ahzantechltd@gmail.com',
  'abdoul@ahzantechltd.com',
  'abdoulganeey@gmail.com',
]);

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAIL_ALLOWLIST.has(email.trim().toLowerCase());
}

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const role = isAdminEmail(email) ? 'admin' : 'buyer';
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          role,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Unable to synchronize user profile.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Unable to fetch user profile.', { cause: error });
  }
}
