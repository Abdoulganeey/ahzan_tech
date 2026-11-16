import {
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
] as const;

const driveProvider = new GoogleAuthProvider();
driveProvider.setCustomParameters({ prompt: 'consent' });
for (const scope of GOOGLE_DRIVE_SCOPES) {
  driveProvider.addScope(scope);
}

// In-memory cache only (never persisted to localStorage or sessionStorage)
let cachedDriveAccessToken: string | null = null;
const tokenListeners = new Set<(token: string | null) => void>();

function notifyTokenListeners() {
  for (const listener of tokenListeners) {
    listener(cachedDriveAccessToken);
  }
}

// Clear cached access token when user signs out
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedDriveAccessToken = null;
    notifyTokenListeners();
  }
});

export function getCachedDriveAccessToken(): string | null {
  return cachedDriveAccessToken;
}

export function clearCachedDriveAccessToken(): void {
  cachedDriveAccessToken = null;
  notifyTokenListeners();
}

export function subscribeDriveTokenChange(
  listener: (token: string | null) => void
): () => void {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

export async function connectGoogleDrive(): Promise<{
  user: User;
  accessToken: string;
}> {
  const result = auth.currentUser
    ? await reauthenticateWithPopup(auth.currentUser, driveProvider).catch(
        async (err: unknown) => {
          const code =
            typeof err === 'object' && err !== null && 'code' in err
              ? String((err as { code?: string }).code)
              : '';
          if (code === 'auth/user-mismatch' || code === 'auth/no-current-user') {
            return signInWithPopup(auth, driveProvider);
          }
          throw err;
        }
      )
    : await signInWithPopup(auth, driveProvider);

  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error(
      'Google Drive authorization did not return an access token. Please try signing in again.'
    );
  }

  cachedDriveAccessToken = credential.accessToken;
  notifyTokenListeners();
  return { user: result.user, accessToken: cachedDriveAccessToken };
}
