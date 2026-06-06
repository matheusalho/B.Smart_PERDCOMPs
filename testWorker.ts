import { parseExcelFile } from './src/services/ExcelParser.ts';
import fs from 'fs';

try {
  console.log('Testing parseExcelFile...');
  // We need an excel file to test...
} catch (err) {
  console.error(err);
}
