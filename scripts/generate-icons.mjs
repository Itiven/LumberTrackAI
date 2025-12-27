// Простой скрипт для генерации базовых иконок PWA
// Требует установки: npm install canvas (опционально) или использует простой SVG конвертер

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');

// Создаем простые PNG иконки через SVG (если canvas недоступен, создаем placeholder)
// Для реальной генерации лучше использовать онлайн-сервисы или canvas

// Простой SVG шаблон для иконки
const createSVGIcon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#18181b" rx="80"/>
  <g transform="translate(128, 128)">
    <rect x="0" y="0" width="256" height="64" fill="#f97316" rx="8"/>
    <rect x="16" y="16" width="224" height="32" fill="#ea580c" rx="4"/>
    <line x1="64" y1="0" x2="64" y2="64" stroke="#d97706" stroke-width="2"/>
    <line x1="128" y1="0" x2="128" y2="64" stroke="#d97706" stroke-width="2"/>
    <line x1="192" y1="0" x2="192" y2="64" stroke="#d97706" stroke-width="2"/>
  </g>
  <text x="400" y="150" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="#ffffff">LT</text>
</svg>
`;

// Создаем SVG файлы (можно конвертировать в PNG позже)
const sizes = [192, 512];
sizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const svgPath = path.join(publicDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svgContent.trim());
  console.log(`Created ${svgPath}`);
});

console.log('\nДля конвертации SVG в PNG используйте:');
console.log('1. Откройте generate-icons.html в браузере');
console.log('2. Или используйте онлайн-конвертер: https://cloudconvert.com/svg-to-png');
console.log('3. Или установите canvas: npm install canvas и обновите скрипт');


