import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const resumes = pgTable('resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const aiAnalyses = pgTable('ai_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  resumeId: uuid('resume_id').references(() => resumes.id),
  type: text('type').notNull(),
  result: jsonb('result').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const jobApplications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  jobTitle: text('job_title').notNull(),
  company: text('company').notNull(),
  status: text('status').default('applied'),
  appliedAt: timestamp('applied_at').defaultNow(),
})