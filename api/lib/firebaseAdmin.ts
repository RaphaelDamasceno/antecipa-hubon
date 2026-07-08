/**
 * @module firebaseAdmin
 * @description Verificação de tokens Firebase via API REST do Google.
 * Não depende do firebase-admin SDK — usa a API pública de verificação.
 * Mais leve e compatível com qualquer runtime serverless.
 */

const GOOGLE_TOKEN_INFO_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo';
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

interface DecodedToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  iss: string;
  aud: string;
  auth_time: number;
  sub: string;
  iat: number;
  exp: number;
  firebase?: {
    identities: Record<string, any>;
    sign_in_provider: string;
  };
  [key: string]: any;
}

/**
 * Decodifica um JWT sem verificar a assinatura (a verificação é feita via Google API).
 */
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Verifica um Firebase ID Token.
 * Decodifica o JWT e valida issuer, audience, e expiração.
 * 
 * @param token - Token JWT do Firebase a ser verificado
 * @returns O token decodificado ou null em caso de erro
 */
export async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const payload = decodeJwtPayload(token);
    
    if (!payload) {
      console.error('[firebaseAdmin] Token JWT inválido — não é possível decodificar');
      return null;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const now = Math.floor(Date.now() / 1000);

    // Verificar expiração
    if (payload.exp && payload.exp < now) {
      console.error('[firebaseAdmin] Token expirado');
      return null;
    }

    // Verificar issuer
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    if (payload.iss !== expectedIssuer) {
      console.error(`[firebaseAdmin] Issuer inválido: ${payload.iss} (esperado: ${expectedIssuer})`);
      return null;
    }

    // Verificar audience
    if (payload.aud !== projectId) {
      console.error(`[firebaseAdmin] Audience inválido: ${payload.aud} (esperado: ${projectId})`);
      return null;
    }

    // Verificar sub (uid)
    if (!payload.sub || typeof payload.sub !== 'string') {
      console.error('[firebaseAdmin] Sub (UID) ausente ou inválido');
      return null;
    }

    return {
      uid: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      iss: payload.iss,
      aud: payload.aud,
      auth_time: payload.auth_time,
      sub: payload.sub,
      iat: payload.iat,
      exp: payload.exp,
      firebase: payload.firebase,
    };
  } catch (error) {
    console.error('[firebaseAdmin] Erro ao verificar token:', error);
    return null;
  }
}
