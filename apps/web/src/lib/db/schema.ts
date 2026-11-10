import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';

export const ROLES = ['admin', 'teacher', 'parent', 'student'] as const;
export type Role = (typeof ROLES)[number];

/** 所有時間欄位均為 epoch 毫秒 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  /** 小寫、全域唯一；學生沒有 username（以班級代碼＋暱稱登入，P1 加入） */
  username: text('username').unique(),
  /** 小寫、唯一；學生不收電郵 */
  email: text('email').unique(),
  displayName: text('display_name').notNull(),
  role: text('role', { enum: ROLES }).notNull(),
  passwordHash: text('password_hash').notNull(),
  status: text('status', { enum: ['active', 'pending', 'disabled'] }).notNull().default('active'),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  emailVerifiedAt: integer('email_verified_at'),
  lastLoginAt: integer('last_login_at'),
  createdAt: integer('created_at').notNull(),
  /** 學生專用：所屬班級與暱稱（同班唯一）；老師備註（如學號）只給老師看 */
  classId: text('class_id'),
  nickname: text('nickname'),
  note: text('note'),
}, (t) => [uniqueIndex('users_class_nick_uq').on(t.classId, t.nickname), index('users_class_idx').on(t.classId)]);

export const sessions = sqliteTable(
  'sessions',
  {
    /** Cookie token 的 SHA-256；資料庫外洩也無法直接冒用 */
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const emailOtps = sqliteTable(
  'email_otps',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    purpose: text('purpose').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('email_otps_lookup_idx').on(t.email, t.purpose)],
);

export const recoveryCodes = sqliteTable(
  'recovery_codes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    usedAt: integer('used_at'),
  },
  (t) => [index('recovery_codes_user_idx').on(t.userId)],
);

export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: integer('reset_at').notNull(),
});

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ts: integer('ts').notNull(),
    actorId: text('actor_id'),
    action: text('action').notNull(),
    target: text('target'),
    ip: text('ip'),
    meta: text('meta'),
  },
  (t) => [index('audit_ts_idx').on(t.ts)],
);

export const emailLogs = sqliteTable(
  'email_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ts: integer('ts').notNull(),
    toEmail: text('to_email').notNull(),
    purpose: text('purpose').notNull(),
    status: text('status', { enum: ['sent', 'failed'] }).notNull(),
    error: text('error'),
    providerId: text('provider_id'),
  },
  (t) => [index('email_logs_ts_idx').on(t.ts)],
);

export const classes = sqliteTable(
  'classes',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    grade: integer('grade').notNull(),
    /** 學生登入用的班級代碼（大寫英數，易讀，不含 0/O/1/I） */
    joinCode: text('join_code').notNull(),
    /** closed＝只由老師建立；approval＝自助加入須老師批准；auto＝自助加入即用 */
    joinMode: text('join_mode', { enum: ['closed', 'approval', 'auto'] }).notNull().default('closed'),
    ownerId: text('owner_id').notNull(),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('classes_code_uq').on(t.joinCode), index('classes_owner_idx').on(t.ownerId)],
);

/** 老師／家長註冊時，驗證電郵前暫存的資料 */
export const pendingRegistrations = sqliteTable('pending_registrations', {
  email: text('email').primaryKey(),
  role: text('role', { enum: ['teacher', 'parent'] }).notNull(),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const bindCodes = sqliteTable('bind_codes', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'),
  createdBy: text('created_by').notNull(),
});

export const parentLinks = sqliteTable(
  'parent_links',
  { parentId: text('parent_id').notNull(), studentId: text('student_id').notNull(), createdAt: integer('created_at').notNull() },
  (t) => [primaryKey({ columns: [t.parentId, t.studentId] })],
);

export const attempts = sqliteTable(
  'attempts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    kind: text('kind', { enum: ['practice', 'assignment', 'redo', 'paper', 'review'] }).notNull(),
    unitId: text('unit_id').notNull(),
    assignmentId: text('assignment_id'),
    /** 含答案的完整題目 JSON：絕不傳給瀏覽器 */
    questions: text('questions').notNull(),
    total: integer('total').notNull(),
    correct: integer('correct').notNull().default(0),
    startedAt: integer('started_at').notNull(),
    finishedAt: integer('finished_at'),
  },
  (t) => [index('attempts_user_idx').on(t.userId, t.startedAt), index('attempts_asg_idx').on(t.assignmentId)],
);

export const attemptAnswers = sqliteTable(
  'attempt_answers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    attemptId: text('attempt_id').notNull(),
    userId: text('user_id').notNull(),
    idx: integer('idx').notNull(),
    unitId: text('unit_id').notNull(),
    tag: text('tag').notNull(),
    correct: integer('correct', { mode: 'boolean' }).notNull(),
    given: text('given').notNull(),
    timeMs: integer('time_ms').notNull().default(0),
    ts: integer('ts').notNull(),
  },
  (t) => [uniqueIndex('aa_attempt_idx_uq').on(t.attemptId, t.idx), index('aa_user_tag_idx').on(t.userId, t.tag)],
);

export const mistakes = sqliteTable(
  'mistakes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    unitId: text('unit_id').notNull(),
    tag: text('tag').notNull(),
    fingerprint: text('fingerprint').notNull(),
    question: text('question').notNull(), // JSON 快照（含答案）
    times: integer('times').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    resolvedAt: integer('resolved_at'),
  },
  (t) => [uniqueIndex('mistakes_fp_uq').on(t.userId, t.fingerprint), index('mistakes_user_idx').on(t.userId, t.resolvedAt)],
);

export const assignments = sqliteTable('assignments', {
  id: text('id').primaryKey(),
  classId: text('class_id').notNull(),
  title: text('title').notNull(),
  unitId: text('unit_id').notNull(),
  count: integer('count').notNull(),
  dueAt: integer('due_at'),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
  /** random＝原本的隨機抽題；fixed＝固定卷面（指向 papers.id，題序與配分固定） */
  mode: text('mode', { enum: ['random', 'fixed'] }).notNull().default('random'),
  paperId: text('paper_id'),
  timeLimitMin: integer('time_limit_min'),
  pointsPerQuestion: integer('points_per_question').notNull().default(10),
});

export const broadcasts = sqliteTable('broadcasts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  /** JSON：{ all?:true, roles?:[], classIds?:[] } */
  audience: text('audience').notNull(),
  sendEmail: integer('send_email', { mode: 'boolean' }).notNull().default(false),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at'),
  recipients: integer('recipients').notNull().default(0),
});

export const broadcastReceipts = sqliteTable(
  'broadcast_receipts',
  { broadcastId: text('broadcast_id').notNull(), userId: text('user_id').notNull(), readAt: integer('read_at') },
  (t) => [primaryKey({ columns: [t.broadcastId, t.userId] }), index('br_user_idx').on(t.userId, t.readAt)],
);

export const emailQueue = sqliteTable(
  'email_queue',
  {
    id: text('id').primaryKey(),
    broadcastId: text('broadcast_id'),
    toEmail: text('to_email').notNull(),
    subject: text('subject').notNull(),
    html: text('html').notNull(),
    text: text('text').notNull(),
    status: text('status', { enum: ['pending', 'sent', 'failed'] }).notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    error: text('error'),
    nextAt: integer('next_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('eq_status_idx').on(t.status, t.nextAt)],
);

export const unsubscribes = sqliteTable('unsubscribes', { email: text('email').primaryKey(), createdAt: integer('created_at').notNull() });

/** 管理員在後台上傳的內容包（存在資料庫裡，所以會跟著備份一起匯出與還原） */
export const contentPacks = sqliteTable('content_packs', {
  name: text('name').primaryKey(),
  json: text('json').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  license: text('license').notNull(),
  source: text('source'),
  units: integer('units').notNull(),
  questions: integer('questions').notNull(),
  uploadedBy: text('uploaded_by'),
  createdAt: integer('created_at').notNull(),
  /** 授權治理：條文連結、取用日期、改編說明、原站連結 */
  licenseUrl: text('license_url'),
  retrievedAt: text('retrieved_at'),
  adaptationNote: text('adaptation_note'),
  sourceUrl: text('source_url'),
  /** 人工抽檢覆核（A6）：抽樣題面的 fingerprint JSON、覆核者與時間 */
  reviewedAt: integer('reviewed_at'),
  reviewedBy: text('reviewed_by'),
  reviewSample: text('review_sample'),
});

/** B1 間隔重複：每張卡對應一道錯題，SM-2 簡化版 */
export const srsCards = sqliteTable(
  'srs_cards',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    unitId: text('unit_id').notNull(),
    tag: text('tag').notNull(),
    fingerprint: text('fingerprint').notNull(),
    question: text('question').notNull(), // JSON 快照（含答案）
    dueAt: integer('due_at').notNull(),
    intervalDays: integer('interval_days').notNull().default(1),
    ease: integer('ease').notNull().default(250), // ×100，2.50
    repetitions: integer('repetitions').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    lastReviewAt: integer('last_review_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('srs_user_fp_uq').on(t.userId, t.fingerprint), index('srs_due_idx').on(t.userId, t.dueAt)],
);

/** B4 徽章 */
export const badges = sqliteTable(
  'badges',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    code: text('code').notNull(),
    earnedAt: integer('earned_at').notNull(),
  },
  (t) => [uniqueIndex('badges_user_code_uq').on(t.userId, t.code), index('badges_user_idx').on(t.userId)],
);

/**
 * B3／C1 試卷。只收原創或明確開放授權的卷；kind='index' 只存外連、不存題目。
 * status='pending' 的卷不會對學生公開，需管理員覆核。
 */
export const papers = sqliteTable(
  'papers',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    subject: text('subject', { enum: ['math', 'english', 'chinese', 'general'] }).notNull(),
    grade: integer('grade').notNull(),
    ownerId: text('owner_id').notNull(),
    kind: text('kind', { enum: ['original', 'licensed', 'index', 'private', 'generated'] }).notNull(),
    status: text('status', { enum: ['draft', 'pending', 'approved', 'rejected'] }).notNull().default('draft'),
    visibility: text('visibility', { enum: ['private', 'class', 'public'] }).notNull().default('private'),
    license: text('license'),
    licenseUrl: text('license_url'),
    sourceUrl: text('source_url'),
    retrievedAt: text('retrieved_at'),
    adaptationNote: text('adaptation_note'),
    /** JSON：固定題序與配分的 ServerQuestion[]；index 卷為 '[]' */
    questions: text('questions').notNull().default('[]'),
    unitIds: text('unit_ids').notNull().default('[]'),
    timeLimitMin: integer('time_limit_min'),
    pointsPerQuestion: integer('points_per_question').notNull().default(10),
    createdAt: integer('created_at').notNull(),
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at'),
    reviewNote: text('review_note'),
  },
  (t) => [index('papers_status_idx').on(t.status, t.visibility), index('papers_owner_idx').on(t.ownerId)],
);

/** 非功能：管理員／老師 TOTP 二步驗證 */
export const totpSecrets = sqliteTable('totp_secrets', {
  userId: text('user_id').primaryKey(),
  secret: text('secret').notNull(),
  enabledAt: integer('enabled_at'),
  createdAt: integer('created_at').notNull(),
});

/** 非功能：老師邀請連結 */
export const invites = sqliteTable('invites', {
  id: text('id').primaryKey(),
  role: text('role', { enum: ['teacher', 'parent'] }).notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: integer('expires_at').notNull(),
  maxUses: integer('max_uses').notNull().default(1),
  uses: integer('uses').notNull().default(0),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
});
