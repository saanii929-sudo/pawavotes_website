import jwt from 'jsonwebtoken';

export interface JWTPayload {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'organization';
  organizationId?: string;
}

export const generateToken = (payload: JWTPayload, expiresIn = '7d'): string => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn,
  });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(
    token,
    process.env.JWT_SECRET || 'your-secret-key'
  ) as JWTPayload;
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};
