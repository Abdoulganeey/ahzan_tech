import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { crmActivitiesSql, crmLeadsSql, crmTasksSql } from './schema.ts';

export interface SqlLeadUpsertInput {
  rankId: number;
  companyName: string;
  normalizedCompanyKey: string;
  leadCategory: string;
  regionCode: string;
  location: string;
  primaryRole: string;
  priorityScore: number;
  priorityTier: string;
  decisionMaker: string;
  title: string;
  generalEmail: string;
  directEmail: string;
  whatsappNumber: string;
  websiteUrl: string;
  outreachStatus: string;
  crmStage: string;
  winProbability: number;
  estimatedTonnage: number;
  targetFobValue: number;
  nextAction: string;
  tags: string;
  notes: string;
  isRiskWatch: boolean;
  isCustomLead: boolean;
  lastUpdatedMillis: number;
}

export async function getSqlCrmOverview(userId: number) {
  try {
    const [leads, activities, tasks] = await Promise.all([
      db
        .select()
        .from(crmLeadsSql)
        .where(eq(crmLeadsSql.userId, userId))
        .orderBy(desc(crmLeadsSql.lastUpdatedMillis)),
      db
        .select()
        .from(crmActivitiesSql)
        .where(eq(crmActivitiesSql.userId, userId))
        .orderBy(desc(crmActivitiesSql.createdAtMillis))
        .limit(100),
      db
        .select()
        .from(crmTasksSql)
        .where(eq(crmTasksSql.userId, userId))
        .orderBy(desc(crmTasksSql.dueAtMillis)),
    ]);

    return { leads, activities, tasks };
  } catch (error) {
    console.error('Database query failed in getSqlCrmOverview:', error);
    throw new Error('Database query failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function upsertSqlLeads(
  userId: number,
  items: SqlLeadUpsertInput[]
) {
  try {
    const synced: number[] = [];
    for (const item of items) {
      await db
        .insert(crmLeadsSql)
        .values({
          userId,
          rankId: item.rankId,
          companyName: item.companyName,
          normalizedCompanyKey: item.normalizedCompanyKey,
          leadCategory: item.leadCategory,
          regionCode: item.regionCode,
          location: item.location,
          primaryRole: item.primaryRole,
          priorityScore: item.priorityScore,
          priorityTier: item.priorityTier,
          decisionMaker: item.decisionMaker,
          title: item.title,
          generalEmail: item.generalEmail,
          directEmail: item.directEmail,
          whatsappNumber: item.whatsappNumber,
          websiteUrl: item.websiteUrl,
          outreachStatus: item.outreachStatus,
          crmStage: item.crmStage,
          winProbability: item.winProbability,
          estimatedTonnage: item.estimatedTonnage,
          targetFobValue: item.targetFobValue,
          nextAction: item.nextAction,
          tags: item.tags,
          notes: item.notes,
          isRiskWatch: item.isRiskWatch,
          isCustomLead: item.isCustomLead,
          lastUpdatedMillis: item.lastUpdatedMillis,
        })
        .onConflictDoUpdate({
          target: crmLeadsSql.rankId,
          set: {
            companyName: item.companyName,
            normalizedCompanyKey: item.normalizedCompanyKey,
            leadCategory: item.leadCategory,
            regionCode: item.regionCode,
            location: item.location,
            primaryRole: item.primaryRole,
            priorityScore: item.priorityScore,
            priorityTier: item.priorityTier,
            decisionMaker: item.decisionMaker,
            title: item.title,
            generalEmail: item.generalEmail,
            directEmail: item.directEmail,
            whatsappNumber: item.whatsappNumber,
            websiteUrl: item.websiteUrl,
            outreachStatus: item.outreachStatus,
            crmStage: item.crmStage,
            winProbability: item.winProbability,
            estimatedTonnage: item.estimatedTonnage,
            targetFobValue: item.targetFobValue,
            nextAction: item.nextAction,
            tags: item.tags,
            notes: item.notes,
            isRiskWatch: item.isRiskWatch,
            isCustomLead: item.isCustomLead,
            lastUpdatedMillis: item.lastUpdatedMillis,
            updatedAt: new Date(),
          },
        });
      synced.push(item.rankId);
    }
    return { syncedCount: synced.length };
  } catch (error) {
    console.error('Database query failed in upsertSqlLeads:', error);
    throw new Error('Failed to synchronize CRM leads.', { cause: error });
  }
}

export async function createSqlTask(params: {
  externalId: string;
  userId: number;
  leadRankId: number;
  companyName: string;
  title: string;
  priority: string;
  dueAtMillis: number;
}) {
  try {
    const [row] = await db
      .insert(crmTasksSql)
      .values({
        externalId: params.externalId,
        userId: params.userId,
        leadRankId: params.leadRankId,
        companyName: params.companyName,
        title: params.title,
        priority: params.priority,
        dueAtMillis: params.dueAtMillis,
        isCompleted: false,
      })
      .onConflictDoUpdate({
        target: crmTasksSql.externalId,
        set: {
          title: params.title,
          priority: params.priority,
          dueAtMillis: params.dueAtMillis,
          updatedAt: new Date(),
        },
      })
      .returning();

    return row;
  } catch (error) {
    console.error('Database query failed in createSqlTask:', error);
    throw new Error('Failed to save follow-up task.', { cause: error });
  }
}
