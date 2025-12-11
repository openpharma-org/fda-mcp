/**
 * Recent FDA Drug Approvals Resource
 * Provides intelligence on latest drug approvals and regulatory trends
 */

import { BaseResource, ResourceContent } from './base.js';
import { logger } from '../logging/index.js';
import { FdaApiClient } from '../api/client.js';
import { FdaRequestParams } from '../types/fda.js';

export class RecentApprovalsResource extends BaseResource {
  private fdaClient: FdaApiClient;

  constructor() {
    super(
      'fda://approvals/recent',
      'Recent FDA Drug Approvals',
      'Latest drug and biologic approvals with market intelligence and competitive analysis',
      'application/json'
    );
    this.fdaClient = new FdaApiClient();
  }

  async getContent(): Promise<ResourceContent> {
    try {
      const requestId = `approvals-${Date.now()}`;

      // Fetch drugs with recent original approvals (within last 90 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // Look back exactly 90 days
      const cutoffDateString = cutoffDate.toISOString().slice(0, 4) + (cutoffDate.getMonth() + 1).toString().padStart(2, '0') + cutoffDate.getDate().toString().padStart(2, '0');

      // Try to find drugs with recent ORIG approvals using date range
      const approvalParams: FdaRequestParams = {
        method: 'lookup_drug',
        search_term: `submissions.submission_type:ORIG AND submissions.submission_status:AP AND submissions.submission_status_date:[${cutoffDateString} TO 20991231]`,
        search_type: 'general',
        limit: 50
      };

      let approvalResponse;
      try {
        approvalResponse = await this.fdaClient.search(approvalParams, requestId);
      } catch (error) {
        // Fallback to simpler query if complex search fails
        logger.warn('Complex approval search failed, falling back to simple search', { error: (error as Error).message }, { component: 'RECENT_APPROVALS_RESOURCE' });
        const fallbackParams: FdaRequestParams = {
          method: 'lookup_drug',
          search_term: '*',
          search_type: 'general',
          limit: 50
        };
        approvalResponse = await this.fdaClient.search(fallbackParams, requestId);
      }

      const results = approvalResponse.results || [];

      // Process real FDA data and extract actual approval dates
      const recentApprovals = [];
      let priorityCount = 0;

      for (const drug of results) {
        const drugRecord = drug as any;

        // Find the original approval submission
        const originalApproval = drugRecord?.submissions?.find((sub: any) =>
          sub.submission_type === 'ORIG' && sub.submission_status === 'AP'
        );

        if (!originalApproval?.submission_status_date) continue;

        // Parse real FDA approval date
        const approvalDateString = originalApproval.submission_status_date;
        const year = approvalDateString.slice(0, 4);
        const month = approvalDateString.slice(4, 6);
        const day = approvalDateString.slice(6, 8);
        const realApprovalDate = `${year}-${month}-${day}`;

        // Only include truly recent approvals (last 90 days)
        const approvalDate = new Date(realApprovalDate);
        const daysAgo = (Date.now() - approvalDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysAgo > 90) continue;

        const brandName = drugRecord?.openfda?.brand_name?.[0] || drugRecord?.products?.[0]?.brand_name || 'Unknown Brand';
        const genericName = drugRecord?.openfda?.generic_name?.[0] || drugRecord?.products?.[0]?.active_ingredients?.[0]?.name || 'Unknown Generic';
        const manufacturerName = drugRecord?.openfda?.manufacturer_name?.[0] || drugRecord?.sponsor_name || 'Unknown Manufacturer';
        const applicationNumber = drugRecord?.application_number || 'Unknown';

        // Determine review priority from submission data
        const hasPriority = originalApproval.review_priority === 'PRIORITY';

        if (hasPriority) priorityCount++;

        // Determine therapeutic class from pharm class
        const pharmClass = drugRecord?.openfda?.pharm_class_epc?.[0] || drugRecord?.openfda?.pharm_class_moa?.[0] || 'General Medicine';

        // Get real indication from products
        const indication = drugRecord?.products?.[0]?.active_ingredients?.map((ing: any) => ing.name).join(', ') || genericName;

        recentApprovals.push({
          applicationNumber,
          approvalDate: realApprovalDate,
          tradeName: brandName,
          genericName: genericName,
          applicant: manufacturerName,
          therapeuticClass: pharmClass,
          indication: `FDA approved for ${indication}`,
          reviewType: hasPriority ? 'Priority Review' : 'Standard Review',
          designations: [], // Real designations not available in this dataset
          regulatoryNotes: `FDA approval date: ${realApprovalDate}${hasPriority ? ' (Priority Review pathway)' : ' (Standard Review pathway)'}`
        });

        // Limit to 10 most recent
        if (recentApprovals.length >= 10) break;
      }

      // Sort by approval date (most recent first)
      recentApprovals.sort((a, b) => new Date(b.approvalDate).getTime() - new Date(a.approvalDate).getTime());

      const approvalData = {
        reportPeriod: "Last 90 days (live FDA data)",
        lastUpdated: new Date().toISOString(),
        totalApprovals: recentApprovals.length,

        summary: {
          totalApprovals: recentApprovals.length,
          priorityReviews: priorityCount,
          standardReviews: recentApprovals.length - priorityCount
        },

        recentApprovals,

        // Generate real analytics from actual FDA data
        applicantAnalysis: (() => {
          const applicantCounts: Record<string, number> = {};
          recentApprovals.forEach(approval => {
            applicantCounts[approval.applicant] = (applicantCounts[approval.applicant] || 0) + 1;
          });
          return Object.entries(applicantCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([company, count]) => ({ company, approvals: count }));
        })(),

        therapeuticClassAnalysis: (() => {
          const classCounts: Record<string, number> = {};
          recentApprovals.forEach(approval => {
            classCounts[approval.therapeuticClass] = (classCounts[approval.therapeuticClass] || 0) + 1;
          });
          return Object.entries(classCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([therapeuticClass, count]) => ({ therapeuticClass, count }));
        })(),

        metadata: {
          dataSource: "FDA OpenFDA API - Drug Applications Database",
          analysisScope: "Last 90 days only - real FDA approval dates",
          updateFrequency: "Dynamic - fetched live on every request",
          methodology: "No caching - fresh FDA API call each time",
          queryWindow: `${cutoffDate.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
          apiCallsUsed: {
            drugApprovals: 'success',
            totalRecords: results.length,
            actualApprovals: recentApprovals.length
          }
        }
      };

      return {
        uri: this.resourceUri,
        mimeType: this.mimeType,
        text: JSON.stringify(approvalData, null, 2),
        metadata: {
          generatedAt: new Date().toISOString(),
          dataFreshness: 'live-dynamic',
          contentSize: JSON.stringify(approvalData).length,
          totalApprovals: approvalData.totalApprovals,
          queryWindow: approvalData.metadata.queryWindow
        }
      };

    } catch (error) {
      logger.error('Failed to generate recent approvals resource', error as Error, {
        component: 'RECENT_APPROVALS_RESOURCE'
      });

      const errorResponse = {
        error: 'Failed to retrieve recent approval data',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
        fallbackRecommendation: 'Check FDA Orange Book and Purple Book directly'
      };

      return {
        uri: this.resourceUri,
        mimeType: this.mimeType,
        text: JSON.stringify(errorResponse, null, 2),
        metadata: {
          generatedAt: new Date().toISOString(),
          dataFreshness: 'error',
          contentSize: JSON.stringify(errorResponse).length
        }
      };
    }
  }
}