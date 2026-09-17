const path = require('node:path');

const root = __dirname;
const env = process.env;

const config = {
  env: env.NODE_ENV || 'development',
  port: Number(env.PORT || 5500),
  root,

  session: {
    secret: env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8,
    },
    storeOptions: {
      dbPath: path.resolve(root, env.DATABASE_PATH || './data/edubridge.db'),
    },
  },

  database: {
    path: path.resolve(root, env.DATABASE_PATH || './data/edubridge.db'),
    walMode: true,
    foreignKeys: true,
    busyTimeout: 5000,
  },

  upload: {
    dir: path.resolve(root, env.UPLOAD_DIR || './private-uploads'),
    maxSize: Number(env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024,
    allowedTypes: (env.ALLOWED_FILE_TYPES || 'pdf,docx,pptx,zip').split(',').map((t) => t.trim().toLowerCase()),
    allowedExtensions: ['.pdf', '.docx', '.pptx', '.zip'],
  },

  auth: {
    adminEmail: env.ADMIN_EMAIL || 'admin@edubridge.local',
    adminPassword: env.ADMIN_PASSWORD,
    bcryptRounds: 12,
    passwordMinLength: 8,
    passwordHistoryCount: 5,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 10,
    },
    globalRateLimit: {
      windowMs: 60 * 1000,
      max: 200,
    },
  },

  branding: {
    appName: env.APP_NAME || 'EduBridge',
    tagline: env.APP_TAGLINE || 'Your Study Companion',
    defaultDepartment: env.DEFAULT_DEPARTMENT || 'Computer Science',
    defaultYear: env.DEFAULT_YEAR || '1st Year',
  },

  https: {
    enabled: env.NODE_ENV === 'production',
    keyPath: env.HTTPS_KEY_PATH ? path.resolve(root, env.HTTPS_KEY_PATH) : null,
    certPath: env.HTTPS_CERT_PATH ? path.resolve(root, env.HTTPS_CERT_PATH) : null,
  },

  security: {
    csrfEnabled: true,
    csrfCookieName: 'csrf_token',
    csrfHeaderName: 'x-csrf-token',
    helmet: {
      contentSecurityPolicy: env.NODE_ENV === 'production',
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      permissionsPolicy: {
        features: {
          camera: [],
          microphone: [],
          geolocation: [],
        },
      },
    },
    trustProxy: env.TRUST_PROXY === 'true',
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  validation: {
    titleMaxLength: 200,
    descriptionMaxLength: 5000,
    nameMaxLength: 100,
    subjectMaxLength: 80,
    departmentMaxLength: 100,
    yearMaxLength: 20,
  },
};

if (config.env === 'production') {
  if (!config.session.secret || config.session.secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }
  if (!config.auth.adminPassword || config.auth.adminPassword === 'Admin@12345') {
    throw new Error('ADMIN_PASSWORD must be set to a strong custom value in production');
  }
  if (config.https.enabled && (!config.https.keyPath || !config.https.certPath)) {
    throw new Error('HTTPS_KEY_PATH and HTTPS_CERT_PATH are required in production');
  }
}

module.exports = config;