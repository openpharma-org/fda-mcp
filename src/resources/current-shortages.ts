/**
 * Current Drug Shortages Resource
 * Real-time FDA drug shortage data from OpenFDA database
 */

import { BaseResource, ResourceContent } from './base.js';
import { logger } from '../logging/index.js';

export class CurrentShortagesResource extends BaseResource {

  constructor() {
    super(
      'fda://shortages/current',
      'Current Drug Shortages',
      'Current active drug shortages from FDA Drug Shortage Database with real shortage details and status',
      'application/json'
    );
  }

  async getContent(): Promise<ResourceContent> {
    const requestId = `shortages-current-${Date.now()}`;

    try {
      // Fetch current drug shortages from FDA database - bypass search to get all entries
      const directUrl = 'https://api.fda.gov/drug/shortages.json?limit=100';
      const response = await fetch(directUrl);
      if (!response.ok) {
        throw new Error(`FDA API error: ${response.status} ${response.statusText}`);
      }
      const shortageResponse = await response.json();
      const shortageData = shortageResponse?.results || [];

      // Filter for current shortages (exclude "Resolved" status)
      const currentShortages = shortageData.filter((shortage: any) =>
        shortage.status && shortage.status !== 'Resolved'
      );

      // Get top therapeutic areas affected
      const therapeuticAreas = this.analyzeTherapeuticAreas(currentShortages);

      // Categorize by status
      const shortagesByStatus = this.categorizeShortagesByStatus(currentShortages);

      const result = {
        reportGenerated: new Date().toISOString(),
        totalCurrentShortages: currentShortages.length,
        dataSource: "FDA Drug Shortage Database (OpenFDA)",

        currentShortages: currentShortages.slice(0, 20).map((shortage: any) => ({
          productName: shortage.proprietary_name || shortage.generic_name || 'Unknown Product',
          genericName: shortage.generic_name || 'Not specified',
          ndc: shortage.package_ndc || 'Not available',
          presentation: shortage.presentation || 'Not specified',
          status: shortage.status || 'Unknown',
          company: shortage.company_name || 'Not specified',
          therapeuticCategory: shortage.therapeutic_category?.join(', ') || 'Not specified',
          lastUpdate: shortage.update_date || shortage.change_date || 'Unknown',
          resolvedNote: shortage.resolved_note || null
        })),

        shortagesByStatus: shortagesByStatus,

        therapeuticImpact: therapeuticAreas,

        recentUpdates: currentShortages
          .sort((a: any, b: any) => new Date(b.update_date || b.change_date || 0).getTime() - new Date(a.update_date || a.change_date || 0).getTime())
          .slice(0, 10)
          .map((shortage: any) => ({
            productName: shortage.proprietary_name || shortage.generic_name,
            genericName: shortage.generic_name,
            status: shortage.status,
            company: shortage.company_name,
            lastUpdate: shortage.update_date || shortage.change_date,
            resolvedNote: shortage.resolved_note
          })),

        summary: {
          totalActive: currentShortages.length,
          totalResolved: shortageData.filter((s: any) => s.status === 'Resolved').length,
          byStatus: shortagesByStatus,
          totalEntries: shortageData.length
        },

        resourceLinks: {
          fdaShortageDatabase: "https://www.accessdata.fda.gov/scripts/drugshortages/",
          reportShortage: "https://www.fda.gov/drugs/drug-shortages/reporting-drug-shortages",
          guidanceDocuments: "https://www.fda.gov/drugs/drug-shortages"
        },

        disclaimer: "This data is sourced from the FDA Drug Shortage Database via OpenFDA API. For the most current information, consult the FDA Drug Shortage Database directly.",

        metadata: {
          apiSource: "OpenFDA Drug Shortages endpoint",
          updateFrequency: "Updated as manufacturers report to FDA",
          dataLimitations: "Limited to FDA-reported shortages; may not include all market shortages",
          lastQuery: new Date().toISOString()
        }
      };

      return {
        uri: this.resourceUri,
        mimeType: this.mimeType,
        text: JSON.stringify(result, null, 2),
        metadata: {
          generatedAt: new Date().toISOString(),
          dataFreshness: 'real-time',
          contentSize: JSON.stringify(result).length,
          totalShortages: currentShortages.length,
          dataSource: 'FDA OpenFDA API'
        }
      };

    } catch (error) {
      logger.error('Failed to fetch current drug shortages', error as Error, {
        component: 'CURRENT_SHORTAGES_RESOURCE',
        requestId
      });

      const errorResponse = {
        error: 'Failed to retrieve current drug shortage data',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
        fallbackRecommendation: 'Check FDA Drug Shortage Database directly at https://www.accessdata.fda.gov/scripts/drugshortages/',
        dataSource: "FDA Drug Shortage Database (OpenFDA) - Error occurred"
      };

      return {
        uri: this.resourceUri,
        mimeType: this.mimeType,
        text: JSON.stringify(errorResponse, null, 2),
        metadata: {
          generatedAt: new Date().toISOString(),
          dataFreshness: 'error',
          contentSize: JSON.stringify(errorResponse).length,
          totalShortages: 0
        }
      };
    }
  }

  private categorizeShortagesByStatus(shortages: any[]): Record<string, number> {
    const statusCounts: Record<string, number> = {};

    shortages.forEach(shortage => {
      const status = shortage.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return statusCounts;
  }

  private analyzeTherapeuticAreas(shortages: any[]): any {
    // Group by generic name to identify therapeutic patterns
    const genericGroups: Record<string, number> = {};

    shortages.forEach(shortage => {
      const generic = shortage.generic_name;
      if (generic) {
        genericGroups[generic] = (genericGroups[generic] || 0) + 1;
      }
    });

    // Sort by frequency
    const sortedGenerics = Object.entries(genericGroups)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      mostAffectedDrugs: sortedGenerics.map(([name, count]) => ({
        genericName: name,
        shortageCount: count
      })),
      totalAffectedDrugs: Object.keys(genericGroups).length,
      analysisNote: "Therapeutic area classification requires additional drug database integration"
    };
  }
}