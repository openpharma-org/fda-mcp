# Orange/Purple Book SQLite Database Schema

## Overview
This document describes the SQLite database schema for FDA Orange Book and Purple Book data.

## Database: `orange-purple-book.db`

### Table: `products`
Orange Book product information (brand and generic drugs)

```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient TEXT NOT NULL,
  dosage_form TEXT,
  route TEXT,
  trade_name TEXT,
  applicant TEXT,
  applicant_full_name TEXT,
  strength TEXT,
  appl_type TEXT NOT NULL,        -- N=NDA, A=ANDA
  appl_no TEXT NOT NULL,
  product_no TEXT NOT NULL,
  te_code TEXT,                    -- AB, AN, AP, etc. (Therapeutic Equivalence)
  approval_date TEXT,
  rld TEXT,                        -- Reference Listed Drug (Yes/No)
  rs TEXT,                         -- Reference Standard (Yes/No)
  type TEXT,                       -- RX, OTC, DISCN
  UNIQUE(appl_type, appl_no, product_no)
);

CREATE INDEX idx_products_ingredient ON products(ingredient);
CREATE INDEX idx_products_trade_name ON products(trade_name);
CREATE INDEX idx_products_appl_no ON products(appl_type, appl_no);
CREATE INDEX idx_products_te_code ON products(te_code);
CREATE INDEX idx_products_rld ON products(rld);
```

### Table: `patents`
Orange Book patent information

```sql
CREATE TABLE patents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appl_type TEXT NOT NULL,
  appl_no TEXT NOT NULL,
  product_no TEXT NOT NULL,
  patent_no TEXT,
  patent_expire_date TEXT,
  drug_substance_flag TEXT,        -- Y if patent covers drug substance
  drug_product_flag TEXT,          -- Y if patent covers drug product
  patent_use_code TEXT,            -- U-XXX codes
  delist_flag TEXT,
  submission_date TEXT,
  FOREIGN KEY (appl_type, appl_no, product_no)
    REFERENCES products(appl_type, appl_no, product_no)
);

CREATE INDEX idx_patents_appl_no ON patents(appl_type, appl_no);
CREATE INDEX idx_patents_patent_no ON patents(patent_no);
CREATE INDEX idx_patents_expire_date ON patents(patent_expire_date);
```

### Table: `exclusivity`
Orange Book exclusivity information

```sql
CREATE TABLE exclusivity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appl_type TEXT NOT NULL,
  appl_no TEXT NOT NULL,
  product_no TEXT NOT NULL,
  exclusivity_code TEXT,           -- NCE, pediatric, orphan, etc.
  exclusivity_date TEXT,           -- Expiration date
  FOREIGN KEY (appl_type, appl_no, product_no)
    REFERENCES products(appl_type, appl_no, product_no)
);

CREATE INDEX idx_exclusivity_appl_no ON exclusivity(appl_type, appl_no);
CREATE INDEX idx_exclusivity_code ON exclusivity(exclusivity_code);
CREATE INDEX idx_exclusivity_date ON exclusivity(exclusivity_date);
```

### Table: `biologics`
Purple Book biologics information

```sql
CREATE TABLE biologics (
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
  reference_product TEXT,          -- BLA number of reference product (for biosimilars)
  reference_product_proper_name TEXT,
  reference_product_proprietary_name TEXT,
  biosimilar TEXT,                 -- Yes/No
  interchangeable TEXT,            -- Yes/No
  interchangeable_date TEXT,       -- Date FDA granted interchangeability
  exclusivity_expiration_date TEXT,
  orphan_exclusivity TEXT,
  pediatric_exclusivity TEXT
);

CREATE INDEX idx_biologics_bla ON biologics(bla_number);
CREATE INDEX idx_biologics_proper_name ON biologics(proper_name);
CREATE INDEX idx_biologics_proprietary_name ON biologics(proprietary_name);
CREATE INDEX idx_biologics_reference ON biologics(reference_product);
CREATE INDEX idx_biologics_biosimilar ON biologics(biosimilar);
CREATE INDEX idx_biologics_interchangeable ON biologics(interchangeable);
```

### Table: `metadata`
Database version and update tracking

```sql
CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Initial values:
-- ('version', '2025-12')
-- ('orange_book_date', '2025-12-12')
-- ('purple_book_date', '2025-12-01')
-- ('created_at', '2025-12-19T10:00:00Z')
-- ('updated_at', '2025-12-19T10:00:00Z')
```

## Full-Text Search Tables

### Table: `products_fts`
Full-text search for products

```sql
CREATE VIRTUAL TABLE products_fts USING fts5(
  ingredient,
  trade_name,
  applicant_full_name,
  content='products',
  content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER products_fts_insert AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, ingredient, trade_name, applicant_full_name)
  VALUES (new.id, new.ingredient, new.trade_name, new.applicant_full_name);
END;

CREATE TRIGGER products_fts_delete AFTER DELETE ON products BEGIN
  DELETE FROM products_fts WHERE rowid = old.id;
END;

CREATE TRIGGER products_fts_update AFTER UPDATE ON products BEGIN
  DELETE FROM products_fts WHERE rowid = old.id;
  INSERT INTO products_fts(rowid, ingredient, trade_name, applicant_full_name)
  VALUES (new.id, new.ingredient, new.trade_name, new.applicant_full_name);
END;
```

### Table: `biologics_fts`
Full-text search for biologics

```sql
CREATE VIRTUAL TABLE biologics_fts USING fts5(
  proper_name,
  proprietary_name,
  applicant_full_name,
  content='biologics',
  content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER biologics_fts_insert AFTER INSERT ON biologics BEGIN
  INSERT INTO biologics_fts(rowid, proper_name, proprietary_name, applicant_full_name)
  VALUES (new.id, new.proper_name, new.proprietary_name, new.applicant_full_name);
END;

CREATE TRIGGER biologics_fts_delete AFTER DELETE ON biologics BEGIN
  DELETE FROM biologics_fts WHERE rowid = old.id;
END;

CREATE TRIGGER biologics_fts_update AFTER UPDATE ON biologics BEGIN
  DELETE FROM biologics_fts WHERE rowid = old.id;
  INSERT INTO biologics_fts(rowid, proper_name, proprietary_name, applicant_full_name)
  VALUES (new.id, new.proper_name, new.proprietary_name, new.applicant_full_name);
END;
```

## Data Sources

### Orange Book Files
- **products.txt**: ~7.3 MB, tilde-delimited
- **patent.txt**: ~1.2 MB, tilde-delimited
- **exclusivity.txt**: ~78 KB, tilde-delimited

### Purple Book Files
- **Purple Book Excel**: ~2 MB, .xlsx format

## Estimated Database Size
- **Total**: 15-20 MB (compressed with SQLite defaults)
- **With indexes**: Additional 2-3 MB
- **Final size**: ~20-25 MB

## TE Code Reference (Therapeutic Equivalence)

| Code | Meaning |
|------|---------|
| AB | Meets necessary bioequivalence requirements |
| AN | Solutions/powders for aerosolization |
| AO | Injectable oil solutions |
| AP | Injectable aqueous solutions |
| AT | Topical products |
| BC | Extended-release dosage forms |
| BD | Active ingredients and dosage forms with documented bioequivalence problems |
| BE | Delayed-release oral dosage forms |
| BN | Products in aerosol-nebulizer drug delivery systems |
| BP | Active ingredients and dosage forms with potential bioequivalence problems |
| BR | Suppositories or enemas |
| BS | Products with drug standard deficiencies |
| BT | Topical products with bioequivalence issues |
| BX | Drug products with insufficient data |

## Exclusivity Code Reference

| Code | Description |
|------|-------------|
| NCE | New Chemical Entity (5 years) |
| NME | New Molecular Entity |
| I-XXX | Orphan Drug Exclusivity (7 years) |
| U-XXX | Pediatric Exclusivity (6 months extension) |
| NGE | New Dosage Form, New Route of Administration, New Combination (3 years) |
| ODE | Orphan Drug Exclusivity |
| PED | Pediatric Exclusivity |

## Notes

1. **Date formats**: Orange Book uses "MMM DD, YYYY" (e.g., "Dec 17, 1996"), Purple Book uses ISO dates
2. **Tilde delimiter**: Orange Book files use `~` as delimiter
3. **Missing values**: Represented as empty strings in source data
4. **Foreign keys**: Not enforced by SQLite by default (need PRAGMA foreign_keys = ON)
