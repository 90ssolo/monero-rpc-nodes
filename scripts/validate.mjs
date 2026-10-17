import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const yamlPath = path.join(rootDir, 'data', 'nodes.yaml');
const data = yaml.load(fs.readFileSync(yamlPath, 'utf8'));

if (!Array.isArray(data.nodes) || data.nodes.length < 20) {
  throw new Error('Dataset must contain at least 20 verified RPC endpoints.');
}

const requiredFields = [
  'id',
  'url',
  'host',
  'port',
  'protocol',
  'network',
  'transport',
  'operator',
  'provenance_source',
  'region',
  'tls_status',
  'cors',
  'restricted_rpc',
  'notes'
];

const validNetworks = new Set(['mainnet', 'stagenet', 'testnet']);
const validTransports = new Set(['clearnet', 'tor', 'i2p']);
const validProtocols = new Set(['http', 'https']);
const ipv4Regex = /^\d{1,3}(\.\d{1,3}){3}$/;

const ids = new Set();
const urls = new Set();

for (const n of data.nodes) {
  for (const f of requiredFields) {
    if (n[f] === undefined || n[f] === null || n[f] === '') {
      throw new Error(`Node "${n.id || n.url}" is missing required field: ${f}`);
    }
  }
  if (ids.has(n.id)) throw new Error(`Duplicate node id: ${n.id}`);
  ids.add(n.id);

  if (urls.has(n.url)) throw new Error(`Duplicate node url: ${n.url}`);
  urls.add(n.url);

  // Anti-spy rule: reject anonymous raw IPv4 or IPv6 addresses
  if (ipv4Regex.test(n.host) || n.host.includes('[')) {
    throw new Error(`Rejected raw IP host "${n.host}" on node "${n.id}": only vetted domain or .onion/.i2p hosts are permitted.`);
  }

  if (!validNetworks.has(n.network)) throw new Error(`Invalid network "${n.network}" on ${n.id}`);
  if (!validTransports.has(n.transport)) throw new Error(`Invalid transport "${n.transport}" on ${n.id}`);
  if (!validProtocols.has(n.protocol)) throw new Error(`Invalid protocol "${n.protocol}" on ${n.id}`);

  if (n.restricted_rpc !== true) {
    throw new Error(`Node "${n.id}" must have restricted_rpc: true`);
  }

  if (!n.provenance_source.startsWith('https://')) {
    throw new Error(`Node "${n.id}" provenance_source must be a valid https:// URL`);
  }

  const parsed = new URL(n.url);
  if (parsed.hostname !== n.host || Number(parsed.port || (n.protocol === 'https' ? 443 : 80)) !== n.port) {
    throw new Error(`Host/port mismatch in URL "${n.url}" for node "${n.id}"`);
  }
}

for (const svgFile of ['assets/hero-banner.svg', 'assets/rpc-security-verification.svg']) {
  const fullPath = path.join(rootDir, svgFile);
  if (!fs.existsSync(fullPath)) throw new Error(`Missing SVG asset: ${svgFile}`);
  const content = fs.readFileSync(fullPath, 'utf8');
  if (!content.startsWith('<svg') || !content.trim().endsWith('</svg>')) {
    throw new Error(`Invalid SVG XML in ${svgFile}`);
  }
}

console.log(`Validated ${data.nodes.length} vetted RPC endpoints (Mainnet, Stagenet, Testnet, Tor) and 2 SVG assets.`);
