/**
 * Top Drugs by Adverse Events Resource
 * Real-time analysis showing top 10 drugs with most adverse events reported in the last 30 days
 */

import { BaseResource, ResourceContent } from './base.js';
import { logger } from '../logging/index.js';

export class TopDrugsByAdverseEventsResource extends BaseResource {
  constructor() {
    super(
      'fda://safety/top-drugs-aes',
      'Top Drugs by Adverse Events',
      'Top 10 drugs with the most adverse events reported in the last 30 days from FAERS database',
      'application/json'
    );
  }

  private calculateDateRange(): { startDate: string; endDate: string } {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Format as YYYYMMDD for FDA API
    const formatDate = (date: Date): string => {
      return date.getFullYear().toString() +
             (date.getMonth() + 1).toString().padStart(2, '0') +
             date.getDate().toString().padStart(2, '0');
    };

    return {
      startDate: formatDate(thirtyDaysAgo),
      endDate: formatDate(today)
    };
  }

  private async fetchTopDrugsByAdverseEvents(): Promise<any> {
    let { startDate, endDate } = this.calculateDateRange();

    // Use count parameter to get top drugs by adverse event count
    // URL encode the brackets for proper API formatting
    const encodedDateRange = `receivedate:%5B${startDate}+TO+${endDate}%5D`;
    let fdaUrl = `https://api.fda.gov/drug/event.json?search=${encodedDateRange}&count=patient.drug.medicinalproduct.exact&limit=10`;

    let response = await fetch(fdaUrl);

    // If no data for last 30 days, try last 90 days as fallback
    if (!response.ok || response.status === 404) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const fallbackStartDate = this.formatDate(ninetyDaysAgo);
      const fallbackDateRange = `receivedate:%5B${fallbackStartDate}+TO+${endDate}%5D`;
      fdaUrl = `https://api.fda.gov/drug/event.json?search=${fallbackDateRange}&count=patient.drug.medicinalproduct.exact&limit=10`;
      response = await fetch(fdaUrl);
    }

    // If still no data, try last year as final fallback
    if (!response.ok || response.status === 404) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const yearStartDate = this.formatDate(oneYearAgo);
      const yearDateRange = `receivedate:%5B${yearStartDate}+TO+${endDate}%5D`;
      fdaUrl = `https://api.fda.gov/drug/event.json?search=${yearDateRange}&count=patient.drug.medicinalproduct.exact&limit=10`;
      response = await fetch(fdaUrl);
    }

    if (!response.ok) {
      throw new Error(`FDA API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    // Check if we got actual results
    if (data.error || !data.results || data.results.length === 0) {
      throw new Error('No adverse events data found in the specified time period');
    }

    return data;
  }

  private formatDate(date: Date): string {
    return date.getFullYear().toString() +
           (date.getMonth() + 1).toString().padStart(2, '0') +
           date.getDate().toString().padStart(2, '0');
  }

  private async fetchSeriousEventsBreakdown(topDrugs: string[]): Promise<any[]> {
    const { startDate, endDate } = this.calculateDateRange();
    const seriousEventsData = [];

    // Get serious events data for top 5 drugs
    for (const drug of topDrugs.slice(0, 5)) {
      try {
        const encodedDrug = encodeURIComponent(drug);
        const encodedDateRange = `receivedate:%5B${startDate}+TO+${endDate}%5D`;
        const seriousUrl = `https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"${encodedDrug}"+AND+serious:1+AND+${encodedDateRange}&count=patient.reaction.reactionmeddrapt.exact&limit=5`;

        const response = await fetch(seriousUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            seriousEventsData.push({
              drug: drug,
              topReactions: data.results || []
            });
          }
        }
      } catch (error) {
        logger.warn(`Failed to fetch serious events for drug: ${drug}`, {
          error: (error as Error).message
        }, {
          component: 'TOP_DRUGS_AES_RESOURCE'
        });
      }
    }

    return seriousEventsData;
  }

  async getContent(): Promise<ResourceContent> {
    const requestId = `trending-aes-${Date.now()}`;

    try {
      logger.info('Fetching top drugs by adverse events', {
        component: 'TOP_DRUGS_AES_RESOURCE',
        requestId
      });

      // Fetch top drugs with most adverse events
      const topDrugsData = await this.fetchTopDrugsByAdverseEvents();
      const topDrugs = topDrugsData?.results || [];

      // Extract drug names for serious events analysis
      const drugNames = topDrugs.map((result: any) => result.term);

      // Fetch serious events breakdown for top drugs
      const seriousEventsData = await this.fetchSeriousEventsBreakdown(drugNames);

      // Calculate total adverse events across all top drugs
      const totalEvents = topDrugs.reduce((sum: number, drug: any) => sum + drug.count, 0);

      // Generate analysis period info
      const { startDate, endDate } = this.calculateDateRange();
      const analysisWindow = `${startDate.slice(0,4)}-${startDate.slice(4,6)}-${startDate.slice(6,8)} to ${endDate.slice(0,4)}-${endDate.slice(4,6)}-${endDate.slice(6,8)}`;

      const trendingAnalysis = {
        reportGenerated: new Date().toISOString(),
        analysisWindow: analysisWindow,
        analysisPeriod: "Last 30 days",
        dataSource: "FDA Adverse Event Reporting System (FAERS)",

        summary: {
          totalTopDrugs: topDrugs.length,
          totalAdverseEvents: totalEvents,
          averageEventsPerDrug: topDrugs.length > 0 ? Math.round(totalEvents / topDrugs.length) : 0,
          dataFreshness: "Real-time from FAERS database"
        },

        topDrugsByAdverseEvents: topDrugs.map((drug: any, index: number) => ({
          rank: index + 1,
          drugName: drug.term,
          adverseEventCount: drug.count,
          percentageOfTotal: topDrugs.length > 0 ? ((drug.count / totalEvents) * 100).toFixed(1) : "0.0"
        })),

        seriousEventsAnalysis: seriousEventsData.map(drugData => ({
          drugName: drugData.drug,
          topSeriousReactions: drugData.topReactions.slice(0, 3).map((reaction: any) => ({
            reaction: reaction.term,
            count: reaction.count
          }))
        })),

        trendingInsights: this.generateTrendingInsights(topDrugs, totalEvents),

        methodology: {
          dataSource: "FDA FAERS (Adverse Event Reporting System)",
          countMethod: "Aggregated by drug name using FDA count API",
          timeWindow: "Rolling 30-day window",
          includedEvents: "All adverse events (serious and non-serious)",
          limitations: [
            "Voluntary reporting system - underreporting expected",
            "Counts reflect reporting volume, not incidence rates",
            "Multiple reports for same patient/event possible",
            "Drug name variations may affect aggregation"
          ]
        },

        metadata: {
          queryDate: new Date().toISOString(),
          fdaApiEndpoint: "drug/event.json with count parameter",
          processingNote: "Data includes all medicinal products reported in adverse events",
          updateFrequency: "Real-time (updated when resource is accessed)"
        }
      };

      return {
        uri: this.resourceUri,
        mimeType: this.mimeType,
        text: JSON.stringify(trendingAnalysis, null, 2),
        metadata: {
          generatedAt: new Date().toISOString(),
          dataFreshness: 'real-time',
          contentSize: JSON.stringify(trendingAnalysis).length,
          analysisWindow: analysisWindow,
          totalDrugsAnalyzed: topDrugs.length
        }
      };

    } catch (error) {
      logger.error('Failed to fetch top drugs by adverse events data', error as Error, {
        component: 'TOP_DRUGS_AES_RESOURCE',
        requestId
      });

      const errorResponse = {
        error: 'Failed to retrieve top drugs by adverse events data',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
        fallbackRecommendation: 'Check FDA FAERS database directly or try again later',
        dataSource: "FDA Adverse Event Reporting System (FAERS)",
        analysisWindow: "Last 30 days"
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

  private generateTrendingInsights(topDrugs: any[], totalEvents: number): string[] {
    const insights = [];

    if (topDrugs.length > 0) {
      const topDrug = topDrugs[0];
      const topDrugPercentage = ((topDrug.count / totalEvents) * 100).toFixed(1);
      insights.push(`${topDrug.term} leads with ${topDrug.count} adverse events (${topDrugPercentage}% of top 10 total)`);
    }

    if (topDrugs.length >= 3) {
      const top3Total = topDrugs.slice(0, 3).reduce((sum: number, drug: any) => sum + drug.count, 0);
      const top3Percentage = ((top3Total / totalEvents) * 100).toFixed(1);
      insights.push(`Top 3 drugs account for ${top3Percentage}% of adverse events in the analysis period`);
    }

    if (topDrugs.length >= 5) {
      const variationCoeff = this.calculateVariationCoefficient(topDrugs.slice(0, 5));
      if (variationCoeff > 0.5) {
        insights.push("High variation in reporting volume suggests diverse drug usage patterns");
      } else {
        insights.push("Consistent reporting volume across top drugs indicates stable usage patterns");
      }
    }

    insights.push(`Analysis based on ${totalEvents} total adverse events from FAERS database`);

    return insights;
  }

  private calculateVariationCoefficient(drugs: any[]): number {
    const counts = drugs.map(drug => drug.count);
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / mean;
  }
}