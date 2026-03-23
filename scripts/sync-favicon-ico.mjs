/**
 * Rasterizes src/assets/favicon.svg → public/favicon.ico so browsers
 * that only request /favicon.ico (and skip <link>) get the payarch mark.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'src/assets/favicon.svg');
const outIco = path.join(root, 'public/favicon.ico');

const svg = fs.readFileSync(svgPath);
const [png16, png32] = await Promise.all([
	sharp(svg).resize(16, 16).png().toBuffer(),
	sharp(svg).resize(32, 32).png().toBuffer(),
]);
const ico = await toIco([png16, png32]);
fs.mkdirSync(path.dirname(outIco), { recursive: true });
fs.writeFileSync(outIco, ico);
