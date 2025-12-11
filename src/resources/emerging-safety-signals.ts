/**
 * Recent Safety Alerts Resource
 * Real-time FDA safety enforcement actions and recent safety alerts
 */

import { BaseResource, ResourceContent } from './base.js';
import { logger } from '../logging/index.js';

export class RecentSafetyAlertsResource extends BaseResource {
  constructor() {
    super(
      'fda://safety/alerts/recent',
      'Recent Safety Alerts',
      'Recent FDA enforcement actions and safety alerts from the last 90 days',
      'application/json'
    );
  }

  async getContent(): Promise<ResourceContent> {
    const requestId = `safety-alerts-${Date.now()}`;

    try {
      // Fetch recent FDA enforcement actions (safety-related recalls)
      const enforcementUrl = 'https://api.fda.gov/drug/enforcement.json?search=classification:(Class+I+OR+Class+II)&sort=recall_initiation_date:desc&limit=50';
      const enforcementResponse = await fetch(enforcementUrl);
      if (!enforcementResponse.ok) {
        throw new Error(`FDA Enforcement API error: ${enforcementResponse.status}`);
      }
      const enforcementData = await enforcementResponse.json();
      const recentEnforcements = enforcementData?.results || [];

      // Filter for recent safety-related enforcement actions (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const recentSafetyActions = recentEnforcements.filter((action: any) => {
        if (!action.recall_initiation_date) return false;
        const actionDate = new Date(
          action.recall_initiation_date.slice(0, 4) + '-' +
          action.recall_initiation_date.slice(4, 6) + '-' +
          action.recall_initiation_date.slice(6, 8)
        );
        return actionDate >= ninetyDaysAgo && action.status !== 'Terminated';
      });

      // Categorize by severity and type
      const alertsByClass = this.categorizeByClassification(recentSafetyActions);
      const alertsByReason = this.categorizeByReason(recentSafetyActions);

      const safetyAlerts = {
        reportGenerated: new Date().toISOString(),
        analysisWindow: "Last 90 days",
        totalActiveAlerts: recentSafetyActions.length,
        dataSource: "FDA Drug Enforcement Database (OpenFDA)",

        urgentSafetyAlerts: recentSafetyActions
          .filter((action: any) => action.classification === 'Class I')
          .slice(0, 10)
          .map((action: any) => ({
            productName: action.product_description || 'Not specified',
            classification: action.classification,
            reason: action.reason_for_recall || 'Not specified',
            recallingFirm: action.recalling_firm || 'Not specified',
            initiationDate: this.formatDate(action.recall_initiation_date),
            distributionPattern: action.distribution_pattern || 'Not specified',
            status: action.status || 'Unknown',
            recallNumber: action.recall_number || 'Not available'
          })),

        criticalSafetyAlerts: recentSafetyActions
          .filter((action: any) => action.classification === 'Class II')
          .slice(0, 15)
          .map((action: any) => ({
            productName: action.product_description || 'Not specified',
            classification: action.classification,
            reason: action.reason_for_recall || 'Not specified',
            recallingFirm: action.recalling_firm || 'Not specified',
            initiationDate: this.formatDate(action.recall_initiation_date),
            distributionPattern: action.distribution_pattern || 'Not specified',
            status: action.status || 'Unknown'
          })),

        alertsByClassification: alertsByClass,
        alertsByReason: alertsByReason,

        topSafetyReasons: Object.entries(alertsByReason)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([reason, count]) => ({
            reason: reason,
            alertCount: count,
            severity: this.assessReasonSeverity(reason)
          })),

        recentCriticalUpdates: recentSafetyActions
          .sort((a: any, b: any) => b.recall_initiation_date.localeCompare(a.recall_initiation_date))
          .slice(0, 5)
          .map((action: any) => ({
            date: this.formatDate(action.recall_initiation_date),
            classification: action.classification,
            product: action.product_description,
            reason: action.reason_for_recall,
            firm: action.recalling_firm
          })),

        summary: {
          totalAlerts: recentSafetyActions.length,
          classI: alertsByClass['Class I'] || 0,
          classII: alertsByClass['Class II'] || 0,
          ongoingActions: recentSafetyActions.filter((a: any) => a.status === 'Ongoing').length,
          completedActions: recentSafetyActions.filter((a: any) => a.status === 'Completed').length
        }
      };

      return {
        uri: this.resourceUri,
        mimeType: this.mimeType,
        text: JSON.stringify(safetyAlerts, null, 2),
        metadata: {
          generatedAt: new Date().toISOString(),
          dataFreshness: 'current',
          contentSize: JSON.stringify(safetyAlerts).length,
          dataSource: 'FDA OpenFDA Enforcement API',
          lastQuery: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Failed to fetch current safety alerts', error as Error, {
        component: 'CURRENT_SAFETY_ALERTS_RESOURCE',
        requestId
      });

      const errorResponse = {
        error: 'Failed to retrieve current safety alerts data',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
        dataSource: 'FDA Drug Enforcement Database (OpenFDA) - Error occurred',
        fallbackRecommendation: 'Check FDA enforcement database directly at https://www.accessdata.fda.gov/scripts/ires/'
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

  private categorizeByClassification(actions: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    actions.forEach(action => {
      const classification = action.classification || 'Unknown';
      counts[classification] = (counts[classification] || 0) + 1;
    });
    return counts;
  }

  private categorizeByReason(actions: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    actions.forEach(action => {
      const reason = this.extractMainReason(action.reason_for_recall || 'Unknown');
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return counts;
  }

  private extractMainReason(fullReason: string): string {
    const reason = fullReason.toLowerCase();

    if (reason.includes('sterility') || reason.includes('contamination') || reason.includes('microbiological')) {
      return 'Sterility/Contamination';
    } else if (reason.includes('potency') || reason.includes('strength') || reason.includes('dose')) {
      return 'Potency/Strength Issues';
    } else if (reason.includes('labeling') || reason.includes('label')) {
      return 'Labeling Defects';
    } else if (reason.includes('stability') || reason.includes('degradation') || reason.includes('impurity')) {
      return 'Stability/Impurity';
    } else if (reason.includes('manufacturing') || reason.includes('production') || reason.includes('facility')) {
      return 'Manufacturing Defects';
    } else if (reason.includes('packaging') || reason.includes('container')) {
      return 'Packaging Defects';
    } else if (reason.includes('cgmp') || reason.includes('compliance') || reason.includes('deviation')) {
      return 'CGMP/Compliance Issues';
    } else {
      return 'Other Safety Issues';
    }
  }

  private assessReasonSeverity(reason: string): string {
    const highRisk = ['Sterility/Contamination', 'Potency/Strength Issues', 'CGMP/Compliance Issues'];
    const mediumRisk = ['Manufacturing Defects', 'Stability/Impurity'];
    const lowRisk = ['Labeling Defects', 'Packaging Defects'];

    if (highRisk.includes(reason)) return 'High';
    if (mediumRisk.includes(reason)) return 'Medium';
    if (lowRisk.includes(reason)) return 'Low';
    return 'Medium';
  }

  private formatDate(dateString: string): string {
    if (!dateString || dateString.length !== 8) return 'Unknown';

    const year = dateString.slice(0, 4);
    const month = dateString.slice(4, 6);
    const day = dateString.slice(6, 8);

    return `${year}-${month}-${day}`;
  }
}