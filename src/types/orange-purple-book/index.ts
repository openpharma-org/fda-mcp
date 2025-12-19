/**
 * TypeScript types for FDA Orange Book and Purple Book data
 */

// ============================================================================
// Orange Book Types
// ============================================================================

export interface OrangeBookProduct {
  id?: number;
  ingredient: string;
  dosageForm: string;
  route: string;
  tradeName: string;
  applicant: string;
  applicantFullName: string;
  strength: string;
  applType: 'N' | 'A'; // N=NDA, A=ANDA
  applNo: string;
  productNo: string;
  teCode: string; // Therapeutic Equivalence Code (AB, AN, AP, etc.)
  approvalDate: string;
  rld: 'Yes' | 'No'; // Reference Listed Drug
  rs: 'Yes' | 'No'; // Reference Standard
  type: 'RX' | 'OTC' | 'DISCN';
}

export interface OrangeBookPatent {
  id?: number;
  applType: 'N' | 'A';
  applNo: string;
  productNo: string;
  patentNo: string;
  patentExpireDate: string;
  drugSubstanceFlag: 'Y' | '';
  drugProductFlag: 'Y' | '';
  patentUseCode: string; // U-XXX codes
  delistFlag: string;
  submissionDate: string;
}

export interface OrangeBookExclusivity {
  id?: number;
  applType: 'N' | 'A';
  applNo: string;
  productNo: string;
  exclusivityCode: string; // NCE, pediatric, orphan, etc.
  exclusivityDate: string;
}

export interface OrangeBookRawData {
  products: string; // Tilde-delimited text
  patents: string; // Tilde-delimited text
  exclusivity: string; // Tilde-delimited text
}

// ============================================================================
// Purple Book Types
// ============================================================================

export interface PurpleBookBiologic {
  id?: number;
  blaNumber: string;
  properName: string;
  proprietaryName: string;
  dateOfLicensure: string;
  licensureStatus: string;
  marketingStatus: string;
  applicant: string;
  applicantFullName: string;
  strength: string;
  dosageForm: string;
  routeOfAdministration: string;
  referenceProduct: string; // BLA number of reference (for biosimilars)
  referenceProductProperName: string;
  referenceProductProprietaryName: string;
  biosimilar: 'Yes' | 'No';
  interchangeable: 'Yes' | 'No';
  interchangeableDate: string;
  exclusivityExpirationDate: string;
  orphanExclusivity: string;
  pediatricExclusivity: string;
}

// ============================================================================
// Query Result Types
// ============================================================================

export interface OrangeBookSearchResult {
  brandProducts: OrangeBookProduct[];
  genericProducts: OrangeBookProduct[];
  totalCount: number;
}

export interface TherapeuticEquivalentsResult {
  referenceListedDrug: OrangeBookProduct | null;
  teRatedGenerics: OrangeBookProduct[]; // AB-rated (substitutable)
  nonTeGenerics: OrangeBookProduct[]; // Non-AB rated
}

export interface PatentExclusivityResult {
  application: {
    applNo: string;
    applType: string;
    tradeName: string;
    ingredient: string;
  };
  patents: OrangeBookPatent[];
  exclusivity: OrangeBookExclusivity[];
}

export interface PatentCliffAnalysis {
  drug: string;
  patentCliffAnalysis: {
    nextExpiration: string | null;
    allPatentsExpire: string | null;
    exclusivityExpires: string | null;
    genericEntryEstimate: string | null;
    yearsUntilLOE: number | null;
  };
  patents: Array<{
    no: string;
    expires: string;
    use: string;
  }>;
  exclusivity: Array<{
    code: string;
    expires: string;
  }>;
}

export interface PurpleBookSearchResult {
  referenceProduct: PurpleBookBiologic | null;
  biosimilars: PurpleBookBiologic[];
  totalCount: number;
}

export interface BiosimilarInterchangeabilityResult {
  referenceProduct: string;
  interchangeableBiosimilars: PurpleBookBiologic[];
  similarButNotInterchangeable: PurpleBookBiologic[];
}

// ============================================================================
// Database Metadata
// ============================================================================

export interface DatabaseMetadata {
  version: string;
  orangeBookDate: string;
  purpleBookDate: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Download Progress
// ============================================================================

export interface DownloadProgress {
  name: string;
  loaded: number;
  total: number;
  percent: number;
}

export interface BuildProgress {
  stage: 'downloading' | 'parsing' | 'building' | 'indexing' | 'complete';
  message: string;
  percent: number;
}
