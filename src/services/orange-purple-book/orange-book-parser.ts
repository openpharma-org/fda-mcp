/**
 * Parse Orange Book tilde-delimited text files
 */

import AdmZip from 'adm-zip';
import type {
  OrangeBookProduct,
  OrangeBookPatent,
  OrangeBookExclusivity,
} from '../../types/orange-purple-book/index.js';
import { logger } from '../../logging/index.js';

/**
 * Parse tilde-delimited line into fields
 */
function parseTildeLine(line: string): string[] {
  return line.split('~').map((field) => field.trim());
}

/**
 * Extract files from Orange Book ZIP
 */
export function extractOrangeBookZip(zipPath: string): {
  productsText: string;
  patentsText: string;
  exclusivityText: string;
} {
  logger.info('Extracting Orange Book ZIP file...');

  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();

  let productsText = '';
  let patentsText = '';
  let exclusivityText = '';

  for (const entry of zipEntries) {
    const fileName = entry.entryName.toLowerCase();

    if (fileName.includes('products.txt')) {
      productsText = entry.getData().toString('utf8');
      logger.info(`Found products.txt (${(productsText.length / 1024).toFixed(0)} KB)`);
    } else if (fileName.includes('patent.txt')) {
      patentsText = entry.getData().toString('utf8');
      logger.info(`Found patent.txt (${(patentsText.length / 1024).toFixed(0)} KB)`);
    } else if (fileName.includes('exclusivity.txt')) {
      exclusivityText = entry.getData().toString('utf8');
      logger.info(`Found exclusivity.txt (${(exclusivityText.length / 1024).toFixed(0)} KB)`);
    }
  }

  if (!productsText || !patentsText || !exclusivityText) {
    throw new Error('Orange Book ZIP is missing required files');
  }

  return { productsText, patentsText, exclusivityText };
}

/**
 * Parse products.txt
 * Format: Ingredient~DF;Route~Trade_Name~Applicant~Strength~Appl_Type~Appl_No~Product_No~TE_Code~Approval_Date~RLD~RS~Type~Applicant_Full_Name
 */
export function parseProducts(text: string): OrangeBookProduct[] {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  const products: OrangeBookProduct[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const fields = parseTildeLine(lines[i]);

    if (fields.length < 14) {
      continue; // Skip malformed lines
    }

    const [dfRoute, ...rest] = fields[1].split(';');

    products.push({
      ingredient: fields[0],
      dosageForm: dfRoute,
      route: rest.join(';'),
      tradeName: fields[2],
      applicant: fields[3],
      strength: fields[4],
      applType: fields[5] as 'N' | 'A',
      applNo: fields[6],
      productNo: fields[7],
      teCode: fields[8],
      approvalDate: fields[9],
      rld: fields[10] as 'Yes' | 'No',
      rs: fields[11] as 'Yes' | 'No',
      type: fields[12] as 'RX' | 'OTC' | 'DISCN',
      applicantFullName: fields[13],
    });
  }

  logger.info(`Parsed ${products.length} products`);
  return products;
}

/**
 * Parse patent.txt
 * Format: Appl_Type~Appl_No~Product_No~Patent_No~Patent_Expire_Date_Text~Drug_Substance_Flag~Drug_Product_Flag~Patent_Use_Code~Delist_Flag~Submission_Date
 */
export function parsePatents(text: string): OrangeBookPatent[] {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  const patents: OrangeBookPatent[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const fields = parseTildeLine(lines[i]);

    if (fields.length < 10) {
      continue; // Skip malformed lines
    }

    patents.push({
      applType: fields[0] as 'N' | 'A',
      applNo: fields[1],
      productNo: fields[2],
      patentNo: fields[3],
      patentExpireDate: fields[4],
      drugSubstanceFlag: fields[5] as 'Y' | '',
      drugProductFlag: fields[6] as 'Y' | '',
      patentUseCode: fields[7],
      delistFlag: fields[8],
      submissionDate: fields[9],
    });
  }

  logger.info(`Parsed ${patents.length} patents`);
  return patents;
}

/**
 * Parse exclusivity.txt
 * Format: Appl_Type~Appl_No~Product_No~Exclusivity_Code~Exclusivity_Date
 */
export function parseExclusivity(text: string): OrangeBookExclusivity[] {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  const exclusivities: OrangeBookExclusivity[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const fields = parseTildeLine(lines[i]);

    if (fields.length < 5) {
      continue; // Skip malformed lines
    }

    exclusivities.push({
      applType: fields[0] as 'N' | 'A',
      applNo: fields[1],
      productNo: fields[2],
      exclusivityCode: fields[3],
      exclusivityDate: fields[4],
    });
  }

  logger.info(`Parsed ${exclusivities.length} exclusivity entries`);
  return exclusivities;
}

/**
 * Parse complete Orange Book ZIP file
 */
export function parseOrangeBook(zipPath: string): {
  products: OrangeBookProduct[];
  patents: OrangeBookPatent[];
  exclusivity: OrangeBookExclusivity[];
} {
  const { productsText, patentsText, exclusivityText } = extractOrangeBookZip(zipPath);

  return {
    products: parseProducts(productsText),
    patents: parsePatents(patentsText),
    exclusivity: parseExclusivity(exclusivityText),
  };
}
