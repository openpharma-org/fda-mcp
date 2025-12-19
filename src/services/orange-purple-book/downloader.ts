/**
 * Download Orange Book and Purple Book data from FDA
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import type { DownloadProgress } from '../../types/orange-purple-book/index.js';
import { logger } from '../../logging/index.js';

const ORANGE_BOOK_URL = 'https://www.fda.gov/media/76860/download';
const PURPLE_BOOK_URL_TEMPLATE = 'https://purplebooksearch.fda.gov/files/{year}/purplebook-search-{month}-data-download.xlsx';

/**
 * Download file with progress tracking
 */
export async function downloadWithProgress(
  url: string,
  outputPath: string,
  name: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  logger.info(`Downloading ${name}...`, { url });

  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 120000, // 2 minutes
    maxRedirects: 5,
    validateStatus: (status) => status === 200, // Only 200 is success
  });

  // Check content type for Purple Book
  const contentType = response.headers['content-type'] || '';
  if (name === 'Purple Book' && !contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') && !contentType.includes('application/vnd.ms-excel')) {
    throw new Error(`Invalid content type: ${contentType}. Expected Excel file.`);
  }

  const totalSize = parseInt(response.headers['content-length'] || '0', 10);
  let downloadedSize = 0;

  const writer = fs.createWriteStream(outputPath);

  response.data.on('data', (chunk: Buffer) => {
    downloadedSize += chunk.length;
    const percent = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;

    if (onProgress) {
      onProgress({
        name,
        loaded: downloadedSize,
        total: totalSize,
        percent,
      });
    }

    // Log progress every 10%
    if (percent % 10 === 0 && downloadedSize > 0) {
      const progressBar = '█'.repeat(percent / 10) + '░'.repeat(10 - percent / 10);
      logger.info(`📊 ${name}: ${progressBar} ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)} MB / ${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
    }
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      logger.info(`✓ ${name} downloaded successfully`, {
        size: `${(downloadedSize / 1024 / 1024).toFixed(1)} MB`,
      });
      resolve();
    });
    writer.on('error', reject);
  });
}

/**
 * Download Orange Book ZIP file
 */
export async function downloadOrangeBook(
  outputPath: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  await downloadWithProgress(
    ORANGE_BOOK_URL,
    outputPath,
    'Orange Book',
    onProgress
  );
}

/**
 * Download Purple Book Excel file
 * Tries recent months in reverse chronological order starting from current month
 */
export async function downloadPurpleBook(
  outputPath: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  const allMonths = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth(); // 0-11

  let lastError: Error | null = null;

  // Start from current month and work backwards through current year
  for (let i = currentMonthIndex; i >= 0; i--) {
    const month = allMonths[i];
    const url = PURPLE_BOOK_URL_TEMPLATE
      .replace('{year}', currentYear.toString())
      .replace('{month}', month);

    try {
      await downloadWithProgress(url, outputPath, 'Purple Book', onProgress);
      return; // Success!
    } catch (error) {
      lastError = error as Error;
      continue;
    }
  }

  // If current year failed, try all months of previous year
  const prevYear = currentYear - 1;
  for (let i = 11; i >= 0; i--) {
    const month = allMonths[i];
    const url = PURPLE_BOOK_URL_TEMPLATE
      .replace('{year}', prevYear.toString())
      .replace('{month}', month);

    try {
      await downloadWithProgress(url, outputPath, 'Purple Book', onProgress);
      return; // Success!
    } catch (error) {
      lastError = error as Error;
      continue;
    }
  }

  throw new Error(
    `Failed to download Purple Book from ${currentYear} or ${prevYear}. Last error: ${lastError?.message}`
  );
}

/**
 * Download both Orange and Purple Book files
 */
export async function downloadAll(
  dataDir: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ orangeBookPath: string; purpleBookPath: string }> {
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const orangeBookPath = path.join(dataDir, 'orange-book.zip');
  const purpleBookPath = path.join(dataDir, 'purple-book.xlsx');

  logger.info('📥 Downloading Orange/Purple Book data (first time only)...');

  // Download Orange Book
  await downloadOrangeBook(orangeBookPath, onProgress);

  // Download Purple Book
  await downloadPurpleBook(purpleBookPath, onProgress);

  return { orangeBookPath, purpleBookPath };
}
