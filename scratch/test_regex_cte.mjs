import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const data = new Uint8Array(fs.readFileSync('scratch/test_cte_43.pdf'));
const loadingTask = pdfjsLib.getDocument({ data });
const doc = await loadingTask.promise;
let fullText = '';
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const textContent = await page.getTextContent();
  const pageText = textContent.items.map(item => item.str).join(' ');
  fullText += pageText + '\n';
}

console.log('--- TESTING REGEX ON FULL TEXT ---');

const mIcms = fullText.match(/(?:VALOR\s+(?:DO\s+)?ICMS|VLR\s+ICMS)[\s\S]{0,35}?(?:R\$\s*)?([\d]{1,3}(?:\.[\d]{3})*,[\d]{2})\b/i) || fullText.match(/\bICMS\s*(?:R\$\s*)?([\d]{1,3}(?:\.[\d]{3})*,[\d]{2})\b/i);
console.log('mIcms match:', mIcms ? mIcms[0] : null, 'group:', mIcms ? mIcms[1] : null);

const mAliqIcms = fullText.match(/(?:AL[ÍI]QUOTA\s+(?:DO\s+)?ICMS|AL[ÍI]Q\s+ICMS|AL[ÍI]Q\.\s*ICMS)[\s\S]{0,20}?([\d.,]+)\s*%/i) || fullText.match(/([\d.,]+)\s*%\s*(?:VALOR\s+(?:DO\s+)?ICMS)?/i);
console.log('mAliqIcms match:', mAliqIcms ? mAliqIcms[0] : null, 'group:', mAliqIcms ? mAliqIcms[1] : null);

const isIsento = /(?:ICMS\s+isento|isento\s+de\s+ICMS|ICMS\s*:\s*isento|CST\s*40|40\s*-\s*ICMS\s+isento)/i.test(fullText);
console.log('isIsento:', isIsento);
