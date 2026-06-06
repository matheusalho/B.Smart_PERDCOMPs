import { parseExcelFile } from './src/services/ExcelParser.ts';
import fs from 'fs';

try {
  console.log('Testing parseExcelFile...');
  const workbookPath = new URL('./dummy.xlsx', import.meta.url);
  if (fs.existsSync(workbookPath)) {
    const file = fs.readFileSync(workbookPath);
    const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
    const { cadeias } = parseExcelFile(arrayBuffer);
    console.log(`Parsed ${cadeias.length} cadeias from dummy.xlsx`);
  } else {
    console.log('dummy.xlsx not found.');
  }
} catch (err) {
  console.error(err);
}
