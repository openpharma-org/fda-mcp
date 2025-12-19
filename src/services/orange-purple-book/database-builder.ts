/**
 * Build SQLite database from Orange Book and Purple Book data
 */

import Database from 'better-sqlite3';
import type {
  OrangeBookProduct,
  OrangeBookPatent,
  OrangeBookExclusivity,
  PurpleBookBiologic,
  DatabaseMetadata,
} from '../../types/orange-purple-book/index.js';
import { logger } from '../../logging/index.js';

/**
 * Create database schema
 */
export function createSchema(db: Database.Database): void {
  logger.info('Creating database schema...');

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient TEXT NOT NULL,
      dosage_form TEXT,
      route TEXT,
      trade_name TEXT,
      applicant TEXT,
      applicant_full_name TEXT,
      strength TEXT,
      appl_type TEXT NOT NULL,
      appl_no TEXT NOT NULL,
      product_no TEXT NOT NULL,
      te_code TEXT,
      approval_date TEXT,
      rld TEXT,
      rs TEXT,
      type TEXT,
      UNIQUE(appl_type, appl_no, product_no)
    );
  `);

  // Patents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS patents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appl_type TEXT NOT NULL,
      appl_no TEXT NOT NULL,
      product_no TEXT NOT NULL,
      patent_no TEXT,
      patent_expire_date TEXT,
      drug_substance_flag TEXT,
      drug_product_flag TEXT,
      patent_use_code TEXT,
      delist_flag TEXT,
      submission_date TEXT
    );
  `);

  // Exclusivity table
  db.exec(`
    CREATE TABLE IF NOT EXISTS exclusivity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appl_type TEXT NOT NULL,
      appl_no TEXT NOT NULL,
      product_no TEXT NOT NULL,
      exclusivity_code TEXT,
      exclusivity_date TEXT
    );
  `);

  // Biologics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS biologics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bla_number TEXT UNIQUE NOT NULL,
      proper_name TEXT,
      proprietary_name TEXT,
      date_of_licensure TEXT,
      licensure_status TEXT,
      marketing_status TEXT,
      applicant TEXT,
      applicant_full_name TEXT,
      strength TEXT,
      dosage_form TEXT,
      route_of_administration TEXT,
      reference_product TEXT,
      reference_product_proper_name TEXT,
      reference_product_proprietary_name TEXT,
      biosimilar TEXT,
      interchangeable TEXT,
      interchangeable_date TEXT,
      exclusivity_expiration_date TEXT,
      orphan_exclusivity TEXT,
      pediatric_exclusivity TEXT
    );
  `);

  // Metadata table
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  logger.info('✓ Schema created');
}

/**
 * Create indexes for faster queries
 */
export function createIndexes(db: Database.Database): void {
  logger.info('Creating indexes...');

  // Products indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_ingredient ON products(ingredient)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_trade_name ON products(trade_name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_appl_no ON products(appl_type, appl_no)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_te_code ON products(te_code)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_rld ON products(rld)');

  // Patents indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_patents_appl_no ON patents(appl_type, appl_no)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_patents_patent_no ON patents(patent_no)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_patents_expire_date ON patents(patent_expire_date)');

  // Exclusivity indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_exclusivity_appl_no ON exclusivity(appl_type, appl_no)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_exclusivity_code ON exclusivity(exclusivity_code)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_exclusivity_date ON exclusivity(exclusivity_date)');

  // Biologics indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_biologics_bla ON biologics(bla_number)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_biologics_proper_name ON biologics(proper_name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_biologics_proprietary_name ON biologics(proprietary_name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_biologics_reference ON biologics(reference_product)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_biologics_biosimilar ON biologics(biosimilar)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_biologics_interchangeable ON biologics(interchangeable)');

  logger.info('✓ Indexes created');
}

/**
 * Create full-text search tables
 */
export function createFTS(db: Database.Database): void {
  logger.info('Creating full-text search tables...');

  // Products FTS
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
      ingredient,
      trade_name,
      applicant_full_name
    );
  `);

  // Populate products FTS
  db.exec(`
    INSERT INTO products_fts(rowid, ingredient, trade_name, applicant_full_name)
    SELECT id, ingredient, trade_name, applicant_full_name FROM products;
  `);

  // Biologics FTS
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS biologics_fts USING fts5(
      proper_name,
      proprietary_name,
      applicant_full_name
    );
  `);

  // Populate biologics FTS
  db.exec(`
    INSERT INTO biologics_fts(rowid, proper_name, proprietary_name, applicant_full_name)
    SELECT id, proper_name, proprietary_name, applicant_full_name FROM biologics;
  `);

  logger.info('✓ FTS tables created and populated');
}

/**
 * Insert products
 */
export function insertProducts(db: Database.Database, products: OrangeBookProduct[]): void {
  logger.info(`Inserting ${products.length} products...`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO products (
      ingredient, dosage_form, route, trade_name, applicant, applicant_full_name,
      strength, appl_type, appl_no, product_no, te_code, approval_date,
      rld, rs, type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((products: OrangeBookProduct[]) => {
    for (const p of products) {
      insert.run(
        p.ingredient, p.dosageForm, p.route, p.tradeName, p.applicant, p.applicantFullName,
        p.strength, p.applType, p.applNo, p.productNo, p.teCode, p.approvalDate,
        p.rld, p.rs, p.type
      );
    }
  });

  insertMany(products);

  logger.info(`✓ Inserted ${products.length} products`);
}

/**
 * Insert patents
 */
export function insertPatents(db: Database.Database, patents: OrangeBookPatent[]): void {
  logger.info(`Inserting ${patents.length} patents...`);

  const insert = db.prepare(`
    INSERT INTO patents (
      appl_type, appl_no, product_no, patent_no, patent_expire_date,
      drug_substance_flag, drug_product_flag, patent_use_code,
      delist_flag, submission_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((patents: OrangeBookPatent[]) => {
    for (const p of patents) {
      insert.run(
        p.applType, p.applNo, p.productNo, p.patentNo, p.patentExpireDate,
        p.drugSubstanceFlag, p.drugProductFlag, p.patentUseCode,
        p.delistFlag, p.submissionDate
      );
    }
  });

  insertMany(patents);

  logger.info(`✓ Inserted ${patents.length} patents`);
}

/**
 * Insert exclusivity
 */
export function insertExclusivity(db: Database.Database, exclusivity: OrangeBookExclusivity[]): void {
  logger.info(`Inserting ${exclusivity.length} exclusivity entries...`);

  const insert = db.prepare(`
    INSERT INTO exclusivity (
      appl_type, appl_no, product_no, exclusivity_code, exclusivity_date
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((exclusivity: OrangeBookExclusivity[]) => {
    for (const e of exclusivity) {
      insert.run(e.applType, e.applNo, e.productNo, e.exclusivityCode, e.exclusivityDate);
    }
  });

  insertMany(exclusivity);

  logger.info(`✓ Inserted ${exclusivity.length} exclusivity entries`);
}

/**
 * Insert biologics
 */
export function insertBiologics(db: Database.Database, biologics: PurpleBookBiologic[]): void {
  logger.info(`Inserting ${biologics.length} biologics...`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO biologics (
      bla_number, proper_name, proprietary_name, date_of_licensure,
      licensure_status, marketing_status, applicant, applicant_full_name,
      strength, dosage_form, route_of_administration,
      reference_product, reference_product_proper_name, reference_product_proprietary_name,
      biosimilar, interchangeable, interchangeable_date,
      exclusivity_expiration_date, orphan_exclusivity, pediatric_exclusivity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((biologics: PurpleBookBiologic[]) => {
    for (const b of biologics) {
      insert.run(
        b.blaNumber, b.properName, b.proprietaryName, b.dateOfLicensure,
        b.licensureStatus, b.marketingStatus, b.applicant, b.applicantFullName,
        b.strength, b.dosageForm, b.routeOfAdministration,
        b.referenceProduct, b.referenceProductProperName, b.referenceProductProprietaryName,
        b.biosimilar, b.interchangeable, b.interchangeableDate,
        b.exclusivityExpirationDate, b.orphanExclusivity, b.pediatricExclusivity
      );
    }
  });

  insertMany(biologics);

  logger.info(`✓ Inserted ${biologics.length} biologics`);
}

/**
 * Insert metadata
 */
export function insertMetadata(db: Database.Database, metadata: DatabaseMetadata): void {
  const insert = db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)');

  const insertMany = db.transaction(() => {
    insert.run('version', metadata.version);
    insert.run('orange_book_date', metadata.orangeBookDate);
    insert.run('purple_book_date', metadata.purpleBookDate);
    insert.run('created_at', metadata.createdAt);
    insert.run('updated_at', metadata.updatedAt);
  });

  insertMany();

  logger.info('✓ Metadata inserted');
}

/**
 * Build complete database
 */
export function buildDatabase(
  dbPath: string,
  orangeBook: {
    products: OrangeBookProduct[];
    patents: OrangeBookPatent[];
    exclusivity: OrangeBookExclusivity[];
  },
  purpleBook: PurpleBookBiologic[],
  metadata: DatabaseMetadata
): void {
  logger.info('⚙️  Building database...');

  const db = new Database(dbPath);

  try {
    // Create schema
    createSchema(db);

    // Insert data
    insertProducts(db, orangeBook.products);
    insertPatents(db, orangeBook.patents);
    insertExclusivity(db, orangeBook.exclusivity);
    insertBiologics(db, purpleBook);
    insertMetadata(db, metadata);

    // Create indexes and FTS
    createIndexes(db);
    createFTS(db);

    // Optimize database
    db.pragma('optimize');
    db.pragma('wal_checkpoint(TRUNCATE)');

    logger.info('✓ Database built successfully');
  } finally {
    db.close();
  }
}
