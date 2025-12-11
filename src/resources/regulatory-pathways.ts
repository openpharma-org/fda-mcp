/**
 * FDA Regulatory Pathways Reference Resource
 * Comprehensive guide to FDA approval processes and requirements
 */

import { BaseResource, ResourceContent } from './base.js';
import { logger } from '../logging/index.js';

export class RegulatoryPathwaysResource extends BaseResource {
  constructor() {
    super(
      'fda://reference/regulatory-pathways',
      'FDA Regulatory Pathways Guide',
      'Comprehensive reference for FDA approval processes, timelines, and requirements across all product categories',
      'application/json'
    );
  }

  async getContent(): Promise<ResourceContent> {
    try {
      const pathwaysGuide = {
        lastUpdated: new Date().toISOString(),
        version: "2025.1",

        drugPathways: {
          nda: {
            name: "New Drug Application (NDA)",
            description: "Standard approval pathway for new molecular entities and new formulations",
            timeline: "10-12 months (standard), 6-8 months (priority)",
            requirements: [
              "Preclinical safety and toxicology data",
              "Phase I, II, and III clinical trial data",
              "Manufacturing information (CMC)",
              "Proposed labeling",
              "Risk evaluation and mitigation strategies (REMS) if needed"
            ],
            fees: {
              applicationFee: "$3,117,218 (2025)",
              establishmentFee: "$794,058",
              productFee: "$132,343"
            },
            success_rate: "92%",
            tips: [
              "Pre-IND meetings highly recommended",
              "End-of-Phase 2 meetings critical for Phase 3 design",
              "Consider breakthrough therapy designation for significant advances"
            ]
          },

          anda: {
            name: "Abbreviated New Drug Application (ANDA)",
            description: "Generic drug approval pathway demonstrating bioequivalence to reference product",
            timeline: "10 months (median)",
            requirements: [
              "Bioequivalence studies",
              "Chemistry, manufacturing, and controls data",
              "Labeling consistent with reference product",
              "Facility inspection readiness"
            ],
            fees: {
              applicationFee: "$234,516 (2025)",
              facilityFee: "$55,638",
              dmiFile: "$44,510"
            },
            success_rate: "78% (first cycle)",
            tips: [
              "Reference product selection critical",
              "Bio-waiver opportunities for certain formulations",
              "Paragraph IV certifications require careful patent analysis"
            ],
            dataResources: {
              orangeBook: {
                description: "FDA Orange Book (Approved Drug Products with Therapeutic Equivalence Evaluations)",
                publicData: "Patent and exclusivity information for approved drugs",
                limitations: "No market value data or competitive analysis",
                format: "Searchable database and downloadable files",
                url: "https://www.fda.gov/drugs/drug-approvals-and-databases/approved-drug-products-therapeutic-equivalence-evaluations-orange-book"
              },
              andaDatabase: {
                description: "FDA ANDA database and approval information",
                publiclyAvailable: "Basic ANDA approval information and status",
                limitations: "Detailed competitive analysis requires proprietary databases",
                accessMethods: [
                  "FDA Drugs@FDA database",
                  "FDA approval letters",
                  "Generic drug approval announcements"
                ]
              }
            },
            complexGenerics: {
              description: "Specialized generic drug development programs",
              fdaInitiatives: [
                "Complex Generic Drug Product Development Program",
                "Competitive Generic Therapy (CGT) designations",
                "Generic Drug User Fee Act (GDUFA) programs"
              ],
              categories: [
                "Liposomal formulations",
                "Peptide drugs",
                "Inhalation products",
                "Transdermal systems",
                "Modified-release formulations"
              ],
              regulatoryGuidances: "FDA guidance documents available for complex generic development"
            },
            marketAnalysisNote: {
              limitation: "Comprehensive market analysis and competitive intelligence are not available through public FDA APIs",
              dataGaps: "Market size, pricing dynamics, and competitive intelligence require proprietary data sources",
              publicAlternatives: [
                "Industry reports from consulting firms",
                "Academic research studies",
                "Company annual reports and SEC filings",
                "Trade association publications"
              ]
            }
          },

          bla: {
            name: "Biologics License Application (BLA)",
            description: "Approval pathway for biological products including vaccines, blood products, and gene therapies",
            timeline: "12 months (standard), 6 months (priority)",
            requirements: [
              "Preclinical data demonstrating safety and activity",
              "Clinical trial data supporting safety and efficacy",
              "Manufacturing information including facility data",
              "Lot release protocols and specifications",
              "Post-market surveillance plans"
            ],
            fees: {
              applicationFee: "$3,117,218 (2025)",
              establishmentFee: "$794,058",
              productFee: "$132,343"
            },
            success_rate: "89%",
            tips: [
              "Early engagement with CBER or CDER critical",
              "Comparability protocols important for manufacturing changes",
              "Biosimilar pathway available for reference biologics"
            ]
          }
        },

        devicePathways: {
          premarket_510k: {
            name: "510(k) Premarket Notification",
            description: "Most common device pathway demonstrating substantial equivalence to predicate device",
            timeline: "90 days (FDA goal)",
            requirements: [
              "Predicate device identification",
              "Substantial equivalence comparison",
              "Performance testing data",
              "Software documentation if applicable",
              "Labeling and user instructions"
            ],
            fees: {
              standard: "$13,934 (2025)",
              small_business: "$3,484"
            },
            success_rate: "85%",
            tips: [
              "Predicate selection is critical to success",
              "Q-Sub meetings available for complex comparisons",
              "De Novo pathway available if no suitable predicate exists"
            ]
          },

          pma: {
            name: "Premarket Approval (PMA)",
            description: "Most stringent device pathway for Class III devices with highest risk",
            timeline: "180 days (FDA goal)",
            requirements: [
              "Comprehensive clinical trial data",
              "Manufacturing and design controls",
              "Risk analysis and mitigation strategies",
              "Post-market study commitments",
              "Advisory panel meeting (often required)"
            ],
            fees: {
              standard: "$445,227 (2025)",
              small_business: "$111,307"
            },
            success_rate: "72%",
            tips: [
              "Pre-submission meetings essential for trial design",
              "Advisory committee preparation is crucial",
              "Post-market studies often required for approval"
            ]
          },

          de_novo: {
            name: "De Novo Classification Request",
            description: "Pathway for novel devices without suitable predicate for 510(k) comparison",
            timeline: "120 days (FDA goal)",
            requirements: [
              "Demonstration of device safety and effectiveness",
              "Risk classification justification",
              "Proposed special controls",
              "Clinical data (if required for risk class)",
              "Post-market study plans (if applicable)"
            ],
            fees: {
              standard: "$27,868 (2025)",
              small_business: "$6,967"
            },
            success_rate: "79%",
            tips: [
              "Establishes new device category for future 510(k)s",
              "Consider breakthrough device designation for expedited review",
              "Special controls development is key to classification"
            ]
          }
        },

        expeditedPathways: {
          breakthrough_therapy: {
            name: "Breakthrough Therapy Designation",
            description: "Expedited review for drugs showing substantial improvement over existing treatments",
            benefits: [
              "More frequent FDA meetings",
              "Rolling review of application components",
              "Priority review designation",
              "Enhanced FDA communication"
            ],
            criteria: "Preliminary clinical evidence of substantial improvement on clinically significant endpoint",
            timeline_impact: "Potential 2-4 month reduction in review time"
          },

          accelerated_approval: {
            name: "Accelerated Approval",
            description: "Approval based on surrogate endpoints for serious conditions with unmet medical need",
            benefits: [
              "Earlier market access",
              "Approval based on surrogate or intermediate endpoints",
              "Competitive advantage in serious diseases"
            ],
            requirements: [
              "Confirmatory trials must be conducted post-approval",
              "Regular safety updates required",
              "Withdrawal possible if confirmatory trials fail"
            ],
            timeline_impact: "Can reduce development time by 2-5 years"
          },

          fast_track: {
            name: "Fast Track Designation",
            description: "Expedited development and review for drugs addressing unmet medical needs",
            benefits: [
              "More frequent FDA meetings",
              "Rolling review availability",
              "Accelerated approval eligibility",
              "Priority review if criteria met"
            ],
            criteria: "Address unmet medical need in serious condition",
            timeline_impact: "Enhanced FDA interaction throughout development"
          }
        },

        planningGuidance: {
          preSubmissionMeetings: [
            "Pre-IND meetings (drugs) - discuss clinical trial design",
            "End-of-Phase 2 meetings - align on Phase 3 design",
            "Pre-submission meetings (devices) - discuss regulatory strategy",
            "Q-Sub meetings - specific technical questions"
          ],

          criticalSuccessFactors: [
            "Early and frequent FDA engagement",
            "Strong preclinical and clinical data packages",
            "Robust manufacturing and quality systems",
            "Clear benefit-risk assessment",
            "Appropriate patient population selection",
            "Comprehensive regulatory strategy planning"
          ],

          commonPitfalls: [
            "Inadequate early FDA interaction",
            "Insufficient manufacturing data at submission",
            "Poor study design or execution",
            "Inadequate safety database",
            "Unclear benefit-risk profile",
            "Missing key regulatory requirements"
          ]
        },

        metadata: {
          authority: "FDA guidance documents and CFR regulations",
          applicability: "US market regulatory requirements",
          lastReviewed: "January 2025",
          feeSchedule: "FY 2025 fee schedule",
          disclaimer: "Fees and timelines subject to annual updates. Consult current FDA guidance."
        }
      };

      return {
        uri: this.resourceUri,
        mimeType: this.mimeType,
        text: JSON.stringify(pathwaysGuide, null, 2),
        metadata: {
          generatedAt: new Date().toISOString(),
          dataFreshness: 'reference-updated-annually',
          contentSize: JSON.stringify(pathwaysGuide).length,
          resourceType: 'regulatory-reference',
          version: pathwaysGuide.version
        }
      };

    } catch (error) {
      logger.error('Failed to generate regulatory pathways resource', error as Error, {
        component: 'REGULATORY_PATHWAYS_RESOURCE'
      });

      const errorResponse = {
        error: 'Failed to retrieve regulatory pathways guide',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
        fallbackRecommendation: 'Check FDA.gov guidance documents and CFR regulations directly'
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