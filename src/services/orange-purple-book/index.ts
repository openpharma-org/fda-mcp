/**
 * Orange/Purple Book Database Service
 * Handles runtime download, caching, and querying
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadAll } from './downloader.js';
import { parseOrangeBook } from './orange-book-parser.js';
import { parsePurpleBook } from './purple-book-parser.js';
import { buildDatabase } from './database-builder.js';
import type {
  OrangeBookSearchResult,
  TherapeuticEquivalentsResult,
  PatentExclusivityResult,
  PatentCliffAnalysis,
  PurpleBookSearchResult,
  BiosimilarInterchangeabilityResult,
  DatabaseMetadata,
  OrangeBookProduct,
  PurpleBookBiologic,
} from '../../types/orange-purple-book/index.js';
import { logger } from '../../logging/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../../data');
const DB_PATH = path.join(DATA_DIR, 'orange-purple-book.db');
const MAX_AGE_DAYS = 30;

/**
 * Main Orange/Purple Book Database Service
 */
export class OrangePurpleBookService {
  private db: Database.Database | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Ensure database is ready (downloads and builds if needed)
   */
  async ensureReady(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // If database already open, check if it's fresh
    if (this.db) {
      if (this.isDatabaseFresh()) {
        return Promise.resolve();
      }
    }

    // Initialize database
    this.initPromise = this.initialize();
    await this.initPromise;
    this.initPromise = null;
  }

  /**
   * Initialize database (download and build if needed)
   */
  private async initialize(): Promise<void> {
    // Check if database exists and is fresh
    if (this.isDatabaseFresh()) {
      logger.info('[Orange/Purple Book] Using existing database');
      this.db = new Database(DB_PATH);
      this.db.pragma('journal_mode = WAL');
      return;
    }

    logger.info('[Orange/Purple Book] Database not found or stale. Downloading...');

    try {
      await this.downloadAndBuild();
    } catch (error) {
      logger.error(
        '[Orange/Purple Book] Failed to download and build database',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Check if database exists and is fresh
   */
  private isDatabaseFresh(): boolean {
    if (!fs.existsSync(DB_PATH)) {
      return false;
    }

    const stats = fs.statSync(DB_PATH);
    const age = Date.now() - stats.mtimeMs;
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

    if (age > maxAge) {
      logger.warn(`[Orange/Purple Book] Database is ${Math.round(age / (24 * 60 * 60 * 1000))} days old (max: ${MAX_AGE_DAYS} days)`);
      return false;
    }

    return true;
  }

  /**
   * Download and build database from FDA sources
   */
  private async downloadAndBuild(): Promise<void> {
    const tempDir = path.join(DATA_DIR, 'temp');

    // Ensure directories exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      // Download files
      const { orangeBookPath, purpleBookPath } = await downloadAll(tempDir, (progress) => {
        // Progress callback
        if (progress.percent % 20 === 0) {
          logger.info(`[Orange/Purple Book] ${progress.name}: ${progress.percent}%`);
        }
      });

      logger.info('⚙️  Parsing data files...');

      // Parse Orange Book
      const orangeBook = parseOrangeBook(orangeBookPath);

      // Parse Purple Book
      const purpleBook = parsePurpleBook(purpleBookPath);

      // Build database
      const metadata: DatabaseMetadata = {
        version: new Date().toISOString().slice(0, 7), // YYYY-MM
        orangeBookDate: new Date().toISOString().split('T')[0],
        purpleBookDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      buildDatabase(DB_PATH, orangeBook, purpleBook, metadata);

      logger.info('✓ Database ready! Future queries will be instant.');

      // Open database for queries (not readonly for FTS)
      this.db = new Database(DB_PATH);
      this.db.pragma('journal_mode = WAL');
    } finally {
      // Cleanup temp files
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  /**
   * Get database instance (ensure ready first)
   */
  private getDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call ensureReady() first.');
    }
    return this.db;
  }

  /**
   * Search Orange Book by drug name
   */
  searchOrangeBook(drugName: string, includeGenerics = true): OrangeBookSearchResult {
    const db = this.getDb();

    // Search using FTS
    const query = `
      SELECT p.* FROM products p
      JOIN products_fts fts ON p.id = fts.rowid
      WHERE products_fts MATCH ?
      ORDER BY p.trade_name, p.ingredient
      LIMIT 100
    `;

    const products = db.prepare(query).all(drugName) as OrangeBookProduct[];

    // Convert snake_case to camelCase
    const convertProduct = (p: any): OrangeBookProduct => ({
      id: p.id,
      ingredient: p.ingredient,
      dosageForm: p.dosage_form,
      route: p.route,
      tradeName: p.trade_name,
      applicant: p.applicant,
      applicantFullName: p.applicant_full_name,
      strength: p.strength,
      applType: p.appl_type,
      applNo: p.appl_no,
      productNo: p.product_no,
      teCode: p.te_code,
      approvalDate: p.approval_date,
      rld: p.rld,
      rs: p.rs,
      type: p.type,
    });

    const convertedProducts = products.map(convertProduct);

    const brandProducts = convertedProducts.filter((p) => p.applType === 'N');
    const genericProducts = includeGenerics
      ? convertedProducts.filter((p) => p.applType === 'A')
      : [];

    return {
      brandProducts,
      genericProducts,
      totalCount: brandProducts.length + genericProducts.length,
    };
  }

  /**
   * Get therapeutic equivalents for a drug
   */
  getTherapeuticEquivalents(drugName: string): TherapeuticEquivalentsResult {
    const result = this.searchOrangeBook(drugName, true);

    // Find the RLD (Reference Listed Drug)
    const rld = result.brandProducts.find((p) => p.rld === 'Yes') || result.brandProducts[0];

    // Filter generics by TE code
    const teRatedGenerics = result.genericProducts.filter((p) => p.teCode?.startsWith('AB'));
    const nonTeGenerics = result.genericProducts.filter((p) => !p.teCode?.startsWith('AB'));

    return {
      referenceListedDrug: rld || null,
      teRatedGenerics,
      nonTeGenerics,
    };
  }

  /**
   * Get patent and exclusivity data for an application
   */
  getPatentExclusivity(ndaNumber: string): PatentExclusivityResult {
    const db = this.getDb();

    // Get application info
    const product = db
      .prepare('SELECT * FROM products WHERE appl_no = ? LIMIT 1')
      .get(ndaNumber) as any;

    if (!product) {
      throw new Error(`No product found for NDA ${ndaNumber}`);
    }

    // Get patents
    const patents = db
      .prepare('SELECT * FROM patents WHERE appl_no = ?')
      .all(ndaNumber) as any[];

    // Get exclusivity
    const exclusivity = db
      .prepare('SELECT * FROM exclusivity WHERE appl_no = ?')
      .all(ndaNumber) as any[];

    return {
      application: {
        applNo: product.appl_no,
        applType: product.appl_type,
        tradeName: product.trade_name,
        ingredient: product.ingredient,
      },
      patents: patents.map((p) => ({
        id: p.id,
        applType: p.appl_type,
        applNo: p.appl_no,
        productNo: p.product_no,
        patentNo: p.patent_no,
        patentExpireDate: p.patent_expire_date,
        drugSubstanceFlag: p.drug_substance_flag,
        drugProductFlag: p.drug_product_flag,
        patentUseCode: p.patent_use_code,
        delistFlag: p.delist_flag,
        submissionDate: p.submission_date,
      })),
      exclusivity: exclusivity.map((e) => ({
        id: e.id,
        applType: e.appl_type,
        applNo: e.appl_no,
        productNo: e.product_no,
        exclusivityCode: e.exclusivity_code,
        exclusivityDate: e.exclusivity_date,
      })),
    };
  }

  /**
   * Analyze patent cliff for a drug
   */
  analyzePatentCliff(drugName: string, _yearsAhead = 5): PatentCliffAnalysis {
    // Get patent/exclusivity data
    const searchResult = this.searchOrangeBook(drugName, false);

    if (searchResult.brandProducts.length === 0) {
      throw new Error(`No brand product found for ${drugName}`);
    }

    const product = searchResult.brandProducts[0];
    const patentExclusivity = this.getPatentExclusivity(product.applNo);

    // Find next expiration
    const patents = patentExclusivity.patents
      .filter((p) => p.patentExpireDate)
      .sort((a, b) => a.patentExpireDate.localeCompare(b.patentExpireDate));

    const exclusivities = patentExclusivity.exclusivity
      .filter((e) => e.exclusivityDate)
      .sort((a, b) => a.exclusivityDate.localeCompare(b.exclusivityDate));

    const nextPatentExpiration = patents[0]?.patentExpireDate || null;
    const allPatentsExpire = patents[patents.length - 1]?.patentExpireDate || null;
    const exclusivityExpires = exclusivities[0]?.exclusivityDate || null;

    // Generic entry is the later of patent or exclusivity expiration
    const genericEntryEstimate = [nextPatentExpiration, exclusivityExpires]
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

    const yearsUntilLOE = genericEntryEstimate
      ? (new Date(genericEntryEstimate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365)
      : null;

    return {
      drug: product.tradeName || product.ingredient,
      patentCliffAnalysis: {
        nextExpiration: nextPatentExpiration,
        allPatentsExpire,
        exclusivityExpires,
        genericEntryEstimate,
        yearsUntilLOE: yearsUntilLOE ? Math.round(yearsUntilLOE * 10) / 10 : null,
      },
      patents: patents.map((p) => ({
        no: p.patentNo,
        expires: p.patentExpireDate,
        use: p.patentUseCode,
      })),
      exclusivity: exclusivities.map((e) => ({
        code: e.exclusivityCode,
        expires: e.exclusivityDate,
      })),
    };
  }

  /**
   * Search Purple Book by drug name
   */
  searchPurpleBook(drugName: string): PurpleBookSearchResult {
    const db = this.getDb();

    // Search using FTS
    const query = `
      SELECT b.* FROM biologics b
      JOIN biologics_fts fts ON b.id = fts.rowid
      WHERE biologics_fts MATCH ?
      ORDER BY b.proprietary_name, b.proper_name
      LIMIT 100
    `;

    const biologics = db.prepare(query).all(drugName) as any[];

    // Convert snake_case to camelCase
    const convertBiologic = (b: any): PurpleBookBiologic => ({
      id: b.id,
      blaNumber: b.bla_number,
      properName: b.proper_name,
      proprietaryName: b.proprietary_name,
      dateOfLicensure: b.date_of_licensure,
      licensureStatus: b.licensure_status,
      marketingStatus: b.marketing_status,
      applicant: b.applicant,
      applicantFullName: b.applicant_full_name,
      strength: b.strength,
      dosageForm: b.dosage_form,
      routeOfAdministration: b.route_of_administration,
      referenceProduct: b.reference_product,
      referenceProductProperName: b.reference_product_proper_name,
      referenceProductProprietaryName: b.reference_product_proprietary_name,
      biosimilar: b.biosimilar,
      interchangeable: b.interchangeable,
      interchangeableDate: b.interchangeable_date,
      exclusivityExpirationDate: b.exclusivity_expiration_date,
      orphanExclusivity: b.orphan_exclusivity,
      pediatricExclusivity: b.pediatric_exclusivity,
    });

    const converted = biologics.map(convertBiologic);

    // Separate reference products and biosimilars
    const referenceProduct = converted.find((b) => b.biosimilar === 'No') || null;
    const biosimilars = converted.filter((b) => b.biosimilar === 'Yes');

    return {
      referenceProduct,
      biosimilars,
      totalCount: converted.length,
    };
  }

  /**
   * Get biosimilar interchangeability information
   */
  getBiosimilarInterchangeability(referenceProductName: string): BiosimilarInterchangeabilityResult {
    const result = this.searchPurpleBook(referenceProductName);

    const interchangeableBiosimilars = result.biosimilars.filter((b) => b.interchangeable === 'Yes');
    const similarButNotInterchangeable = result.biosimilars.filter((b) => b.interchangeable === 'No');

    return {
      referenceProduct: result.referenceProduct?.proprietaryName || referenceProductName,
      interchangeableBiosimilars,
      similarButNotInterchangeable,
    };
  }

  /**
   * Get database metadata
   */
  getMetadata(): DatabaseMetadata | null {
    if (!this.db) {
      return null;
    }

    const rows = this.getDb()
      .prepare('SELECT key, value FROM metadata')
      .all() as Array<{ key: string; value: string }>;

    const metadata: any = {};
    for (const row of rows) {
      metadata[row.key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] = row.value;
    }

    return metadata as DatabaseMetadata;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let instance: OrangePurpleBookService | null = null;

/**
 * Get singleton instance
 */
export function getOrangePurpleBookService(): OrangePurpleBookService {
  if (!instance) {
    instance = new OrangePurpleBookService();
  }
  return instance;
}
