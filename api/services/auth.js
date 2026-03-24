// PA CROP Services — Auth Service
// Tech spec: sections 7.1, 12.1, 12.2
// JWT session management, RBAC, access code verification.

import { SignJWT, jwtVerify } from 'jose';
import * as db from './db.js';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'crop-dev-secret-change-in-production');
const TOKEN_EXPIRY = '24h';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE';

// ── JWT ────────────────────────────────────────────────────

export async function createSession(client) {
  const token = await new SignJWT({
    sub: client.id,
    org: client.organization_id,
    plan: client.plan_code,
    roles: client.roles || ['client'],
    email: client.email
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return {
    token,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      valid: true,
      clientId: payload.sub,
      orgId: payload.org,
      plan: payload.plan,
      roles: payload.roles || ['client'],
      email: payload.email
    };
  } catch {
    return { valid: false };
  }
}

// ── Access Code ────────────────────────────────────────────

export function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function sendAccessCode(email) {
  const code = generateAccessCode();
  // Store code in client metadata (expires in 15 min)
  const client = await db.getClientByEmail(email);
  if (!client) return { success: false, error: 'not_found' };

  await db.updateClient(client.id, {
    metadata: {
      ...client.metadata,
      access_code: code,
      access_code_expires: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }
  });

  // Send via Emailit
  const emailitKey = process.env.EMAILIT_API_KEY;
  if (emailitKey) {
    await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${emailitKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PA CROP Services <access@pacropservices.com>',
        to: email,
        subject: 'Your PA CROP Access Code',
        html: `<div style="font-family:Outfit,sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#0C1220">Your Access Code</h2>
          <div style="background:#f0f4f8;padding:20px;border-radius:12px;text-align:center;margin:20px 0">
            <span style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#0C1220">${code}</span>
          </div>
          <p>This code expires in 15 minutes.</p>
          <p style="color:#666;font-size:13px">If you didn't request this, ignore this email.</p>
        </div>`
      })
    });
  }

  return { success: true };
}

export async function verifyAccessCode(email, code) {
  const client = await db.getClientByEmail(email);
  if (!client) return { valid: false, error: 'not_found' };

  const meta = client.metadata || {};
  if (!meta.access_code || meta.access_code !== code) return { valid: false, error: 'invalid_code' };
  if (new Date(meta.access_code_expires) < new Date()) return { valid: false, error: 'expired' };

  // Clear used code
  await db.updateClient(client.id, {
    metadata: { ...meta, access_code: null, access_code_expires: null }
  });

  return {
    valid: true,
    client: {
      id: client.id,
      organization_id: client.organization_id,
      plan_code: client.plan_code,
      email: client.email,
      roles: meta.roles || ['client']
    }
  };
}

// ── RBAC ───────────────────────────────────────────────────

export function requireRole(session, ...roles) {
  if (!session?.valid) return { authorized: false, error: 'unauthenticated' };
  const userRoles = session.roles || [];
  if (roles.some(r => userRoles.includes(r))) return { authorized: true };
  return { authorized: false, error: 'insufficient_role' };
}

// ── Middleware helpers ──────────────────────────────────────

export async function authenticateRequest(req) {
  // Check Bearer token first
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifySession(token);
  }
  return { valid: false };
}

export function isAdminRequest(req) {
  const key = req.headers['x-admin-key'] || req.query?.adminKey;
  return key === ADMIN_KEY;
}

// ── CORS helper ────────────────────────────────────────────

const ALLOWED_ORIGINS = ['https://pacropservices.com', 'https://www.pacropservices.com', 'https://pa-crop-services.vercel.app'];

export function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
}
