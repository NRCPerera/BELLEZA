const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CLIENT_URL: z.string().url('CLIENT_URL must be an absolute URL'),
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
});

const loadEnv = () => {
  const result = schema.safeParse(process.env);
  if (!result.success) throw new Error(`Invalid environment: ${result.error.issues.map((i) => i.message).join('; ')}`);
  const env = result.data;
  if (env.NODE_ENV === 'production') {
    if (env.COOKIE_SAME_SITE === 'none' && !env.COOKIE_DOMAIN) throw new Error('COOKIE_DOMAIN is required when COOKIE_SAME_SITE=none');
    const cloudinary = [env.CLOUDINARY_CLOUD_NAME, env.CLOUDINARY_API_KEY, env.CLOUDINARY_API_SECRET];
    if (cloudinary.some(Boolean) && cloudinary.some((value) => !value)) throw new Error('All Cloudinary variables must be configured together');
    if (Boolean(env.RESEND_API_KEY) !== Boolean(env.EMAIL_FROM)) throw new Error('RESEND_API_KEY and EMAIL_FROM must be configured together');
  }
  return env;
};

module.exports = { loadEnv };
