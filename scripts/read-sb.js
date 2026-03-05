const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve('C:/Users/srpat/OneDrive/Documents/GitHub/slipper8s/data/silverbulletin/Sbcb_Mens_Odds_March_16_2025.xlsx');
console.log('Reading:', filePath);

const wb = XLSX.readFile(filePath);
console.log('Sheet names:', wb.SheetNames);

const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log('Total rows:', data.length);
console.log('Columns in row 0:', data[0]?.length);

for (let i = 0; i < Math.min(8, data.length); i++) {
  console.log(`\nRow ${i}:`, JSON.stringify(data[i]));
}
