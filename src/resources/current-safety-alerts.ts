/**
 * Current FDA Safety Alerts Resource
 * Provides real-time FDA safety communications and warnings
 */

import { BaseResource, ResourceContent } from './base.js';
import { logger } from '../logging/index.js';
import { FdaApiClient } from '../api/client.js';
import { FdaRequestParams } from '../types/fda.js';

export class CurrentSafetyAlertsResource extends BaseResource {
  private fdaClient: FdaApiClient;

  constructor() {
    super(
      'fda://safety/alerts/current',
      'Current FDA Safety Alerts',
      'Latest FDA safety communications, warnings, and alerts across all product categories',
      'application/json'
    );
    this.fdaClient = new FdaApiClient();
  }

  async getContent(): Promise<ResourceContent> {
    const requestId = `safety-alerts-${Date.now()}`;

    try {
      // Fetch recent drug labeling with black box warnings
      const blackBoxParams: FdaRequestParams = {
        method: 'lookup_drug',
        search_term: '_exists_:boxed_warning',
        search_type: 'label',
        limit: 10,
        fields_for_label: 'openfda.brand_name,openfda.generic_name,boxed_warning,effective_time,warnings_and_cautions'
      };

      // Fetch recent recalls for safety alerts
      const recallParams: FdaRequestParams = {
        method: 'lookup_drug',
        search_term: 'Class I',
        search_type: 'recalls',
        limit: 5
      };

      const [blackBoxResponse, recallResponse] = await Promise.allSettled([
        this.fdaClient.search(blackBoxParams, `${requestId}-blackbox`),
        this.fdaClient.search(recallParams, `${requestId}-recalls`)
      ]);

      const blackBoxData = blackBoxResponse.status === 'fulfilled' ? blackBoxResponse.value : null;
      const recallData = recallResponse.status === 'fulfilled' ? recallResponse.value : null;

      // Process real FDA data into safety alerts format
      const recentAlerts = [];
      let criticalCount = 0;

      // Process black box warnings
      if (blackBoxData?.results) {
        for (const drug of blackBoxData.results.slice(0, 5)) {
          const drugRecord = drug as any;
          const brandName = drugRecord?.openfda?.brand_name?.[0] || 'Unknown Brand';
          const genericName = drugRecord?.openfda?.generic_name?.[0] || 'Unknown Generic';
          const boxedWarning = drugRecord?.boxed_warning?.[0] || '';

          if (boxedWarning) {
            const severity = boxedWarning.toLowerCase().includes('death') ||
                           boxedWarning.toLowerCase().includes('life-threatening') ? 'critical' : 'warning';

            if (severity === 'critical') criticalCount++;

            recentAlerts.push({
              id: `BWA-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              date: new Date().toISOString().split('T')[0],
              type: 'Black Box Warning',
              severity,
              title: `Black Box Warning for ${brandName} (${genericName})`,
              summary: boxedWarning.substring(0, 200) + (boxedWarning.length > 200 ? '...' : ''),
              affectedProducts: [brandName],
              recommendedActions: [
                'Review complete prescribing information',
                'Monitor patients closely for adverse effects',
                'Consider risk-benefit assessment for each patient',
                'Report adverse events to FDA MedWatch'
              ],
              fdaUrl: 'https://www.fda.gov/drugs/drug-safety-and-availability'
            });
          }
        }
      }

      // Process Class I recalls as critical safety alerts
      if (recallData?.results) {
        for (const recall of recallData.results.slice(0, 3)) {
          const recallRecord = recall as any;
          const productDescription = recallRecord?.product_description || 'Unknown Product';
          const reason = recallRecord?.reason_for_recall || 'Safety concern';

          criticalCount++;
          recentAlerts.push({
            id: `RCA-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            date: recallRecord?.report_date || new Date().toISOString().split('T')[0],
            type: 'Class I Recall Alert',
            severity: 'critical',
            title: `Class I Recall: ${productDescription}`,
            summary: reason.substring(0, 200) + (reason.length > 200 ? '...' : ''),
            affectedProducts: [productDescription],
            recommendedActions: [
              'Immediately discontinue use of affected product',
              'Check inventory for recalled lots',
              'Contact patients who may have received recalled product',
              'Report adverse events to FDA'
            ],
            fdaUrl: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts'
          });
        }
      }

      const safetyAlerts = {
        lastUpdated: new Date().toISOString(),
        alertCount: recentAlerts.length,
        criticalAlerts: criticalCount,
        categories: {
          drugs: recentAlerts.filter(a => a.type.includes('Warning') || a.type.includes('Recall')).length,
          devices: 0, // Would need separate device API calls
          biologics: 0 // Would need separate biologic API calls
        },
        recentAlerts,
        riskCategories: {
          cardiovascular: {
            alertCount: recentAlerts.filter(a =>
              a.summary.toLowerCase().includes('cardiovascular') ||
              a.summary.toLowerCase().includes('heart')
            ).length,
            latestAlert: new Date().toISOString().split('T')[0],
            riskLevel: 'high'
          },
          safety_concerns: {
            alertCount: criticalCount,
            latestAlert: new Date().toISOString().split('T')[0],
            riskLevel: criticalCount > 3 ? 'high' : 'moderate'
          }
        },
        trendingConcerns: [
          'Black box warnings for newly identified safety signals',
          'Class I recalls requiring immediate action',
          'Post-market surveillance findings',
          'Drug safety communications'
        ],
        actionableInsights: [
          `${criticalCount} critical safety alerts require immediate healthcare provider attention`,
          `${recentAlerts.length} recent safety communications from FDA`,
          'Enhanced monitoring recommended for affected medications',
          'Review patient therapy for recalled or warned products'
        ],
        metadata: {
          dataSource: 'FDA OpenFDA API - Drug Labels and Recalls',
          updateFrequency: 'Real-time from FDA databases',
          coverage: 'FDA-approved drugs with safety communications',
          reliability: 'Official FDA data',
          apiCallsUsed: {
            blackBoxWarnings: blackBoxData ? 'success' : 'failed',
            recalls: recallData ? 'success' : 'failed'
          }
        }
      };

      return {
        uri: this.resourceUri,
        mimeType: this.mimeType,
        text: JSON.stringify(safetyAlerts, null, 2),
        metadata: {
          generatedAt: new Date().toISOString(),
          dataFreshness: 'real-time',
          contentSize: JSON.stringify(safetyAlerts).length,
          criticalAlertsCount: safetyAlerts.criticalAlerts
        }
      };

    } catch (error) {
      logger.error('Failed to generate safety alerts resource', error as Error, {
        component: 'SAFETY_ALERTS_RESOURCE'
      });

      const errorResponse = {
        error: 'Failed to retrieve current safety alerts',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
        fallbackRecommendation: 'Check FDA.gov safety communications directly'
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