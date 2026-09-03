const isProduction = process.env.NODE_ENV === 'production';

const secret = process.env.JWT_SECRET;

if (!secret && isProduction) {
    throw new Error('JWT_SECRET must be set in production');
}

export const JWT_SECRET = secret || 'dev_only_insecure_secret';
export const JWT_EXPIRES_IN = '7d';