// Gmail API & OAuth 2.0 Integration Client
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Email } from '../types';

export interface GmailAuthStatus {
  isConnected: boolean;
  userEmail: string | null;
  accessToken: string | null;
  expiresAt: number | null;
  profile?: {
    emailAddress?: string;
    messagesTotal?: number;
    threadsTotal?: number;
  };
}

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly'
];

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(app);

const googleAuthProvider = new GoogleAuthProvider();
GMAIL_SCOPES.forEach((scope) => googleAuthProvider.addScope(scope));
// Force prompt to ensure refresh/account selection
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

const STORAGE_KEY = 'nexa_gmail_auth_state';

// In-memory cache for fast access
let inMemoryAccessToken: string | null = null;
let inMemoryUserEmail: string | null = null;

// Helper to get cached OAuth state
export function getSavedGmailAuth(): GmailAuthStatus {
  if (inMemoryAccessToken && inMemoryUserEmail) {
    return {
      isConnected: true,
      userEmail: inMemoryUserEmail,
      accessToken: inMemoryAccessToken,
      expiresAt: Date.now() + 3600 * 1000
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { isConnected: false, userEmail: null, accessToken: null, expiresAt: null };
    }
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      return { ...parsed, isConnected: false, accessToken: null };
    }
    if (parsed.accessToken) {
      inMemoryAccessToken = parsed.accessToken;
      inMemoryUserEmail = parsed.userEmail;
    }
    return parsed;
  } catch {
    return { isConnected: false, userEmail: null, accessToken: null, expiresAt: null };
  }
}

export function saveGmailAuth(state: GmailAuthStatus) {
  inMemoryAccessToken = state.accessToken;
  inMemoryUserEmail = state.userEmail;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to persist Gmail auth state:', e);
  }
}

export function clearGmailAuth() {
  inMemoryAccessToken = null;
  inMemoryUserEmail = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
}

// Construct RFC 2822 raw base64url email string
export function createRawEmail(params: {
  to: string;
  from?: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}): string {
  const { to, from, subject, body, cc, bcc } = params;

  const headers: string[] = [
    `To: ${to}`,
    ...(from ? [`From: ${from}`] : []),
    ...(cc ? [`Cc: ${cc}`] : []),
    ...(bcc ? [`Bcc: ${bcc}`] : []),
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit'
  ];

  const fullEmail = `${headers.join('\r\n')}\r\n\r\n${body}`;

  // Base64URL encode without padding
  return btoa(unescape(encodeURIComponent(fullEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sign in using Firebase Auth with Google OAuth & Gmail scopes.
 * Falls back to Google Identity Services if needed, and handles popup closures gracefully.
 */
export async function connectGmailAccount(): Promise<{
  success: boolean;
  cancelled?: boolean;
  error?: string;
  email?: string;
}> {
  // Method 1: Firebase Auth Popup Flow
  try {
    const result = await signInWithPopup(firebaseAuth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (accessToken) {
      const email = result.user.email || 'Google User';
      const authState: GmailAuthStatus = {
        isConnected: true,
        userEmail: email,
        accessToken,
        expiresAt: Date.now() + 3500 * 1000
      };
      saveGmailAuth(authState);
      return { success: true, email };
    }
  } catch (firebaseErr: any) {
    const code = firebaseErr?.code || '';
    const message = firebaseErr?.message || '';

    // Handle user closing popup or popup blocker
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      message.includes('Popup window closed') ||
      message.includes('popup-closed')
    ) {
      return {
        success: false,
        cancelled: true,
        error: 'Authorization window was closed. Click Connect Gmail to try again, or open the app in a new tab if your browser blocks popups in iframes.'
      };
    }

    if (code === 'auth/popup-blocked') {
      return {
        success: false,
        cancelled: true,
        error: 'Popup was blocked by your browser. Please allow popups for this site or open in a new tab.'
      };
    }

    console.warn('Firebase Auth popup attempt encountered error, trying Google Identity Services:', firebaseErr);
  }

  // Method 2: Google Identity Services (GSI) Token Client Fallback
  return new Promise((resolve) => {
    const gsi = (window as any).google?.accounts?.oauth2;
    if (!gsi) {
      resolve({
        success: false,
        error: 'Google Identity Services SDK is loading. Please try again in a moment.'
      });
      return;
    }

    const clientId =
      (firebaseConfig as any).oAuthClientId ||
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      '';

    let resolved = false;

    const tokenClient = gsi.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SCOPES.join(' '),
      callback: async (response: any) => {
        if (resolved) return;
        resolved = true;

        if (response.error) {
          if (response.error === 'popup_closed_by_user' || response.error === 'access_denied') {
            resolve({
              success: false,
              cancelled: true,
              error: 'Google authorization window was closed.'
            });
            return;
          }
          resolve({
            success: false,
            error: response.error_description || response.error || 'OAuth authorization failed'
          });
          return;
        }

        const token = response.access_token;
        const expiresInSec = parseInt(response.expires_in || '3599', 10);
        const expiresAt = Date.now() + (expiresInSec - 60) * 1000;

        try {
          const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const profileData = await profileRes.json();
          const email = profileData.emailAddress || 'Connected Account';

          const authState: GmailAuthStatus = {
            isConnected: true,
            userEmail: email,
            accessToken: token,
            expiresAt,
            profile: profileData
          };

          saveGmailAuth(authState);
          resolve({ success: true, email });
        } catch {
          const authState: GmailAuthStatus = {
            isConnected: true,
            userEmail: 'Connected Account',
            accessToken: token,
            expiresAt
          };
          saveGmailAuth(authState);
          resolve({ success: true, email: 'Connected Account' });
        }
      },
      error_callback: (err: any) => {
        if (resolved) return;
        resolved = true;
        resolve({
          success: false,
          cancelled: true,
          error: 'Google authorization popup closed or blocked by browser.'
        });
      }
    });

    try {
      tokenClient.requestAccessToken({ prompt: '' });
    } catch (e: any) {
      if (!resolved) {
        resolved = true;
        resolve({
          success: false,
          error: e?.message || 'Could not launch Google authentication popup.'
        });
      }
    }
  });
}

// Send Real-Time Email via Gmail API
export async function sendEmailViaGmailApi(
  token: string,
  params: {
    to: string;
    from?: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
  }
): Promise<{ id: string; threadId: string; labelIds?: string[] }> {
  const rawBase64 = createRawEmail(params);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: rawBase64 })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData?.error?.message || `Gmail API Error: ${res.statusText} (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return data;
}

function decodeBase64Url(str: string): string {
  try {
    let clean = str.replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4) {
      clean += '=';
    }
    return decodeURIComponent(escape(atob(clean)));
  } catch (e) {
    try {
      return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return str;
    }
  }
}

function extractEmailBody(payload: any): string {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.parts) {
        const nested = extractEmailBody(part);
        if (nested) return nested;
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = decodeBase64Url(part.body.data);
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }
  return '';
}

// Fetch live messages from user's Gmail inbox / sent items
export async function fetchLiveGmailMessages(
  token: string,
  query: string = '',
  maxResults: number = 15
): Promise<Email[]> {
  try {
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${
      query ? `&q=${encodeURIComponent(query)}` : ''
    }`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!listRes.ok) {
      console.warn('Failed to list Gmail messages:', listRes.status);
      return [];
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    const detailedEmails: Email[] = await Promise.all(
      messages.map(async (item: { id: string; threadId: string }) => {
        try {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!msgRes.ok) return null;
          const msg = await msgRes.json();

          const headers: { name: string; value: string }[] = msg.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          const subject = getHeader('Subject') || '(No Subject)';
          const from = getHeader('From');
          const to = getHeader('To');
          const date = getHeader('Date');
          const cc = getHeader('Cc');
          const bcc = getHeader('Bcc');

          let senderName = from;
          let senderEmail = from;
          const match = from.match(/^(.*?)\s*<(.+?)>$/);
          if (match) {
            senderName = match[1].replace(/^["']|["']$/g, '').trim() || match[2];
            senderEmail = match[2];
          }

          const labelIds: string[] = msg.labelIds || [];
          let folder: 'inbox' | 'sent' | 'drafts' | 'starred' | 'trash' = 'inbox';
          if (labelIds.includes('SENT')) folder = 'sent';
          else if (labelIds.includes('DRAFT')) folder = 'drafts';
          else if (labelIds.includes('TRASH')) folder = 'trash';

          const starred = labelIds.includes('STARRED');
          const read = !labelIds.includes('UNREAD');

          const body = extractEmailBody(msg.payload) || msg.snippet || '';

          return {
            id: `gmail_${msg.id}`,
            senderName: senderName || 'Gmail Sender',
            senderEmail: senderEmail || 'sender@gmail.com',
            recipientEmail: to || 'me',
            cc: cc || undefined,
            bcc: bcc || undefined,
            subject,
            body,
            folder,
            read,
            starred,
            timestamp: date ? new Date(date).toLocaleString() : 'Recent'
          } as Email;
        } catch (e) {
          console.warn('Error fetching single Gmail message:', e);
          return null;
        }
      })
    );

    return detailedEmails.filter(Boolean) as Email[];
  } catch (err) {
    console.error('Error in fetchLiveGmailMessages:', err);
    return [];
  }
}
