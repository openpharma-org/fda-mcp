/**
 * Parse Purple Book Excel file
 */

import XLSX from 'xlsx';
import type { PurpleBookBiologic } from '../../types/orange-purple-book/index.js';
import { logger } from '../../logging/index.js';

/**
 * Normalize cell value to string
 */
function getCellValue(row: any, key: string): string {
  const value = row[key];
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

/**
 * Parse Purple Book Excel file
 * The Excel file has a title row, then headers in row 2, then data starts at row 3
 */
export function parsePurpleBook(excelPath: string): PurpleBookBiologic[] {
  logger.info('Parsing Purple Book Excel file...');

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON, skipping the first 2 rows (title + header row)
  const rows = XLSX.utils.sheet_to_json(worksheet, { range: 2 });

  logger.info(`Found ${rows.length} rows in Purple Book`);

  const biologics: PurpleBookBiologic[] = [];

  for (const row of rows) {
    const rowData: any = row;

    // The actual column names are in __EMPTY, __EMPTY_1, etc.
    // Row 2 tells us: __EMPTY = Applicant, __EMPTY_1 = BLA Number, etc.
    const applicant = getCellValue(rowData, '__EMPTY');
    const blaNumber = getCellValue(rowData, '__EMPTY_1');
    const proprietaryName = getCellValue(rowData, '__EMPTY_2');
    const properName = getCellValue(rowData, '__EMPTY_3');
    const blaType = getCellValue(rowData, '__EMPTY_4');
    const strength = getCellValue(rowData, '__EMPTY_5');
    const dosageForm = getCellValue(rowData, '__EMPTY_6');
    const routeOfAdmin = getCellValue(rowData, '__EMPTY_7');
    const marketingStatus = getCellValue(rowData, '__EMPTY_9');
    const licensureStatus = getCellValue(rowData, '__EMPTY_10');
    const approvalDate = getCellValue(rowData, '__EMPTY_11');
    const refProductProperName = getCellValue(rowData, '__EMPTY_12');
    const refProductProprietaryName = getCellValue(rowData, '__EMPTY_13');
    const dateOfFirstLicensure = getCellValue(rowData, '__EMPTY_19');
    const exclusivityExpDate = getCellValue(rowData, '__EMPTY_20');
    const firstInterchangeableExclusivity = getCellValue(rowData, '__EMPTY_21');
    const orphanExclusivity = getCellValue(rowData, '__EMPTY_23');

    if (!blaNumber) {
      continue; // Skip rows without BLA number
    }

    // Determine if this is a biosimilar (351(k) BLA type or has reference product)
    // Reference products have "N/A" or empty reference product fields
    const hasReferenceProduct = refProductProperName && refProductProperName !== 'N/A' && refProductProperName !== '';
    const isBiosimilar = blaType === '351(k)' || hasReferenceProduct;

    // Check for interchangeability
    const isInterchangeable = !!firstInterchangeableExclusivity && firstInterchangeableExclusivity !== '';

    const biologic: PurpleBookBiologic = {
      blaNumber,
      properName,
      proprietaryName,
      dateOfLicensure: dateOfFirstLicensure || approvalDate,
      licensureStatus,
      marketingStatus,
      applicant,
      applicantFullName: applicant, // They're the same in this file
      strength,
      dosageForm,
      routeOfAdministration: routeOfAdmin,
      referenceProduct: '', // Not directly in the file, we'd need to match by reference product names
      referenceProductProperName: refProductProperName,
      referenceProductProprietaryName: refProductProprietaryName,
      biosimilar: isBiosimilar ? 'Yes' : 'No',
      interchangeable: isInterchangeable ? 'Yes' : 'No',
      interchangeableDate: firstInterchangeableExclusivity,
      exclusivityExpirationDate: exclusivityExpDate,
      orphanExclusivity,
      pediatricExclusivity: '', // Not in this version of the file
    };

    biologics.push(biologic);
  }

  logger.info(`Parsed ${biologics.length} biologics from Purple Book`);

  return biologics;
}
