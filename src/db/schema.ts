import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Authenticated portal & admin users keyed by Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('buyer'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relational Lithium Intel CRM leads & buyers mirror
export const crmLeadsSql = pgTable('crm_leads', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  rankId: integer('rank_id').notNull().unique(),
  companyName: text('company_name').notNull(),
  normalizedCompanyKey: text('normalized_company_key').notNull(),
  leadCategory: text('lead_category').notNull().default('LITHIUM'),
  regionCode: text('region_code').notNull().default('ASIA_PACIFIC'),
  location: text('location').notNull().default(''),
  primaryRole: text('primary_role').notNull().default(''),
  priorityScore: integer('priority_score').notNull().default(70),
  priorityTier: text('priority_tier').notNull().default('B'),
  decisionMaker: text('decision_maker').notNull().default(''),
  title: text('title').notNull().default(''),
  generalEmail: text('general_email').notNull().default(''),
  directEmail: text('direct_email').notNull().default(''),
  whatsappNumber: text('whatsapp_number').notNull().default(''),
  websiteUrl: text('website_url').notNull().default(''),
  outreachStatus: text('outreach_status').notNull().default('READY'),
  crmStage: text('crm_stage').notNull().default('PROSPECT'),
  winProbability: integer('win_probability').notNull().default(15),
  estimatedTonnage: doublePrecision('estimated_tonnage').notNull().default(0),
  targetFobValue: doublePrecision('target_fob_value').notNull().default(0),
  nextAction: text('next_action').notNull().default(''),
  tags: text('tags').notNull().default(''),
  notes: text('notes').notNull().default(''),
  isRiskWatch: boolean('is_risk_watch').notNull().default(false),
  isCustomLead: boolean('is_custom_lead').notNull().default(false),
  lastUpdatedMillis: bigint('last_updated_millis', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relational CRM activities / outreach logs
export const crmActivitiesSql = pgTable('crm_activities', {
  id: serial('id').primaryKey(),
  externalId: text('external_id').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  leadRankId: integer('lead_rank_id').notNull(),
  companyName: text('company_name').notNull(),
  activityType: text('activity_type').notNull(),
  outcome: text('outcome').notNull().default(''),
  summary: text('summary').notNull().default(''),
  quoteAmountUsd: doublePrecision('quote_amount_usd'),
  createdAtMillis: bigint('created_at_millis', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relational CRM follow-up tasks queue
export const crmTasksSql = pgTable('crm_tasks', {
  id: serial('id').primaryKey(),
  externalId: text('external_id').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  leadRankId: integer('lead_rank_id').notNull(),
  companyName: text('company_name').notNull(),
  title: text('title').notNull(),
  priority: text('priority').notNull().default('MEDIUM'),
  dueAtMillis: bigint('due_at_millis', { mode: 'number' }).notNull(),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAtMillis: bigint('completed_at_millis', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  leads: many(crmLeadsSql),
  activities: many(crmActivitiesSql),
  tasks: many(crmTasksSql),
}));

export const crmLeadsSqlRelations = relations(crmLeadsSql, ({ one }) => ({
  owner: one(users, {
    fields: [crmLeadsSql.userId],
    references: [users.id],
  }),
}));

export const crmActivitiesSqlRelations = relations(crmActivitiesSql, ({ one }) => ({
  owner: one(users, {
    fields: [crmActivitiesSql.userId],
    references: [users.id],
  }),
}));

export const crmTasksSqlRelations = relations(crmTasksSql, ({ one }) => ({
  owner: one(users, {
    fields: [crmTasksSql.userId],
    references: [users.id],
  }),
}));
