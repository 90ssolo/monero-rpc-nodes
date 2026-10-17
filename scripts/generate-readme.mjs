import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = yaml.load(fs.readFileSync(path.join(rootDir, 'data', 'nodes.yaml'), 'utf8'));

const jsonExport = {
  last_verified_utc: data.last_verified_utc,
  consensus_snapshots: data.consensus_snapshots,
  mainnet: {
    https: data.nodes.filter(n => n.network === 'mainnet' && n.transport === 'clearnet' && n.protocol === 'https').map(n => n.url),
    http: data.nodes.filter(n => n.network === 'mainnet' && n.transport === 'clearnet' && n.protocol === 'http').map(n => n.url),
    tor: data.nodes.filter(n => n.network === 'mainnet' && n.transport === 'tor').map(n => n.url)
  },
  stagenet: {
    clearnet: data.nodes.filter(n => n.network === 'stagenet' && n.transport === 'clearnet').map(n => n.url),
    tor: data.nodes.filter(n => n.network === 'stagenet' && n.transport === 'tor').map(n => n.url)
  },
  testnet: {
    clearnet: data.nodes.filter(n => n.network === 'testnet' && n.transport === 'clearnet').map(n => n.url)
  },
  nodes: data.nodes
};

fs.writeFileSync(path.join(rootDir, 'data', 'nodes.json'), JSON.stringify(jsonExport, null, 2) + '\n', 'utf8');

const mainnetHttps = data.nodes.filter(n => n.network === 'mainnet' && n.transport === 'clearnet' && n.protocol === 'https');
const mainnetHttp = data.nodes.filter(n => n.network === 'mainnet' && n.transport === 'clearnet' && n.protocol === 'http');
const stagenetClear = data.nodes.filter(n => n.network === 'stagenet' && n.transport === 'clearnet');
const testnetClear = data.nodes.filter(n => n.network === 'testnet' && n.transport === 'clearnet');
const torNodes = data.nodes.filter(n => n.transport === 'tor');

let md = `<p align="center">
  <img src="assets/hero-banner.svg" alt="Monero Public RPC Nodes" width="100%" />
</p>

# Monero Public RPC Nodes (Mainnet & Stagenet) [![Validate Dataset](https://github.com/90ssolo/monero-rpc-nodes/actions/workflows/validate.yml/badge.svg)](https://github.com/90ssolo/monero-rpc-nodes/actions/workflows/validate.yml) [![License: CC0-1.0](https://img.shields.io/badge/License-CC0_1.0-lightgrey.svg)](LICENSE)

Public **Monero (\`monerod\`) remote RPC nodes** for **Mainnet**, **Stagenet** and **Testnet**, along with a small Node.js script to check that each node is on the real chain, uses restricted RPC and returns normal fee estimates.

Scraped node lists often mix community-run servers with dozens of unnamed raw-IP cloud VPS instances that have the Monero Research Lab (MRL) ban list turned off or sit on stale forks. This repository only lists nodes run by known wallet projects, MRL contributors and established community operators, and separates nodes with valid CA-signed HTTPS certificates from plain HTTP or self-signed ports.

## Contents

- [Copy-paste node lists](#copy-paste-node-lists)
- [1. Mainnet — HTTPS nodes (CA-signed TLS)](#1-mainnet--https-nodes-ca-signed-tls)
- [2. Mainnet — HTTP and self-signed TLS nodes](#2-mainnet--http-and-self-signed-tls-nodes)
- [3. Stagenet — Clearnet nodes (for testing)](#3-stagenet--clearnet-nodes-for-testing)
- [4. Tor (\`.onion\`) nodes (Mainnet & Stagenet)](#4-tor-onion-nodes-mainnet--stagenet)
- [5. Testnet nodes](#5-testnet-nodes)
- [How fake and misconfigured nodes are filtered out](#how-fake-and-misconfigured-nodes-are-filtered-out)
- [Check the nodes yourself](#check-the-nodes-yourself)
- [JSON and YAML files](#json-and-yaml-files)
- [Related guides and projects](#related-guides-and-projects)

---

## Copy-paste node lists

### Mainnet HTTPS (valid TLS certificate — for web wallets, relays and payment servers)

\`\`\`ini
MONERO_NODE_URLS=https://xmr-node.cakewallet.com:18081,https://node.sethforprivacy.com:443,https://node3.monerodevs.org:18089,https://node.monerodevs.org:18089,https://node2.monerodevs.org:18089,https://ravfx.its-a-node.org:18081,https://ravfx2.its-a-node.org:18089,https://xmr.cryptostorm.is:18081,https://xmr1.doggett.tech:18089,https://monero.stackwallet.com:18081
\`\`\`

### Mainnet HTTPS with browser CORS (\`Access-Control-Allow-Origin: *\`)

\`\`\`ini
MONERO_CORS_NODE_URLS=https://node.sethforprivacy.com:443,https://ravfx.its-a-node.org:18081,https://ravfx2.its-a-node.org:18089,https://xmr.cryptostorm.is:18081
\`\`\`

### Stagenet (for testing wallets, checkouts and webhooks with free Stagenet XMR)

\`\`\`ini
MONERO_STAGENET_NODE_URLS=http://node.sethforprivacy.com:38089,http://node3.monerodevs.org:38089,http://node.monerodevs.org:38089,http://node2.monerodevs.org:38089,http://stagenet.xmr-tw.org:38081,http://xmr-lux.boldsuck.org:38081
\`\`\`

---

## 1. Mainnet — HTTPS nodes (CA-signed TLS)

These endpoints present a valid TLS certificate trusted by standard browsers and Node.js, run with \`restricted_rpc: true\`, and match the Mainnet top block hash (\`${data.consensus_snapshots.mainnet.top_block_hash.slice(0, 16)}...\` at height \`${data.consensus_snapshots.mainnet.height}\`).

| Address | Operator | Region | TLS | Browser CORS | Restricted RPC |
|---|---|---|---|---|---|
`;

for (const n of mainnetHttps) {
  md += `| \`${n.url}\` | ${n.operator} | ${n.region} | ${n.tls_status} | ${n.cors} | \`${n.restricted_rpc}\` |\n`;
}

md += `
---

## 2. Mainnet — HTTP and self-signed TLS nodes

These nodes are run by known community operators (and appear in Feather Wallet's default \`nodes.json\` or pool infrastructure), but use plain \`http://\` or a self-signed certificate on their RPC port. They work in desktop/CLI wallets that accept self-signed certs, but will be rejected by browsers and strict HTTPS clients unless proxied.

> [!WARNING]
> Plain \`http://\` over the internet can be read or altered along the way. For real money over a remote node, prefer CA-signed \`https://\` (Section 1), Tor \`.onion\` (Section 4), or your own node.

| Address | Operator | Region | TLS / port note | Restricted RPC |
|---|---|---|---|---|
`;

for (const n of mainnetHttp) {
  md += `| \`${n.url}\` | ${n.operator} | ${n.region} | ${n.tls_status} | \`${n.restricted_rpc}\` |\n`;
}

md += `
---

## 3. Stagenet — Clearnet nodes (for testing)

Stagenet uses the same rules as Mainnet with free test coins. All endpoints below were checked against Stagenet block \`${data.consensus_snapshots.stagenet.height}\` (hash \`${data.consensus_snapshots.stagenet.top_block_hash.slice(0, 16)}...\`, difficulty \`${data.consensus_snapshots.stagenet.wide_difficulty}\`).

| Address | Operator | Region | Port | Restricted RPC | Notes |
|---|---|---|---|---|---|
`;

for (const n of stagenetClear) {
  md += `| \`${n.url}\` | ${n.operator} | ${n.region} | \`${n.port}\` | \`${n.restricted_rpc}\` | ${n.notes} |\n`;
}

md += `
---

## 4. Tor (\`.onion\`) nodes (Mainnet & Stagenet)

Using a node over Tor hides your IP address from the node operator and encrypts traffic end-to-end. These addresses come from Feather Wallet's [\`src/assets/nodes.json\`](https://raw.githubusercontent.com/feather-wallet/feather/master/src/assets/nodes.json) and Cake Wallet's documentation.

| Network | Onion address | Operator | Port |
|---|---|---|---|
`;

for (const n of torNodes) {
  md += `| **${n.network.toUpperCase()}** | \`${n.url}\` | ${n.operator} | \`${n.port}\` |\n`;
}

md += `
---

## 5. Testnet nodes

| Address | Operator | Port | Checked height | Block hash prefix |
|---|---|---|---|---|
`;

for (const n of testnetClear) {
  md += `| \`${n.url}\` | ${n.operator} | \`${n.port}\` | \`${n.verified_height}\` | \`${n.verified_hash.slice(0, 16)}...\` |\n`;
}

md += `
---

## How fake and misconfigured nodes are filtered out

<p align="center">
  <img src="assets/rpc-security-verification.svg" alt="Remote node security boundaries and checks" width="100%" />
</p>

A remote node never receives your private keys and cannot spend your coins or see your balance. What a bad node *can* do is log your IP address, lie about fee estimates, hold back blocks so payments look missing, or feed you unconfirmed transactions on a fake chain.

To keep those out, this list checks five things:

1. **No unnamed raw-IP servers.**
   Public node crawlers regularly pick up dozens of raw IPv4 addresses on cheap cloud hosts with the MRL spy-node ban list turned off. Because Sybil clusters use unnamed IP hosts to log wallet connections, \`scripts/validate.mjs\` rejects raw IP addresses. Every entry must have a domain name or \`.onion\` address and a known operator.
2. **Matching top block hash and difficulty.**
   \`scripts/verify-live.mjs\` calls \`get_info\` on every clearnet node and compares \`height\`, \`top_block_hash\` and \`wide_difficulty\` against independent operators (Cake Wallet, Seth for Privacy, MoneroDevs).
3. **Fee estimate check (\`get_fee_estimate\`).**
   A rogue node can return a huge number from \`get_fee_estimate\` so your wallet overpays miner fees. The check script flags any node whose fee estimate is out of line.
4. **Restricted RPC (\`restricted: true\`).**
   Public nodes must run with \`--restricted-rpc\` so unsafe daemon commands are turned off.
5. **Real HTTPS separated from self-signed ports.**
   Many nodes listen on \`18081\` or \`18089\` with a self-signed certificate (\`DEPTH_ZERO_SELF_SIGNED_CERT\`), which breaks browser wallets and standard \`fetch()\` calls. Only nodes with a valid certificate from a public CA are listed in Section 1.

---

## Check the nodes yourself

To ping every clearnet Mainnet, Stagenet and Testnet node from your own machine and check latency, TLS, CORS headers, block hashes and fee estimates:

\`\`\`bash
npm install
npm run verify-live
\`\`\`

To validate \`data/nodes.yaml\` and rebuild \`data/nodes.json\` and \`README.md\`:

\`\`\`bash
npm test
npm run build
\`\`\`

---

## JSON and YAML files

- **[\`data/nodes.json\`](data/nodes.json):** Plain JSON lists grouped under \`mainnet.https\`, \`mainnet.http\`, \`mainnet.tor\`, \`stagenet.clearnet\` and \`stagenet.tor\`, plus the full array of node records.
- **[\`data/nodes.yaml\`](data/nodes.yaml):** Source file with operator details, provenance links and checked block hashes.

---

## Related guides and projects

- **[Monero Remote Nodes: How to Choose and Use One Safely](https://monkstash.com/monero-remote-node):** What a remote node can and cannot see, when to use Tor, and what to do if a wallet will not sync.
- **[How to Run a Monero Node](https://monkstash.com/run-a-monero-node):** Setting up your own full or pruned \`monerod\` node.
- **[Awesome Monero Payments](https://github.com/90ssolo/awesome-monero-payments):** Comparison of Monero payment servers, browser tills, shop plugins and libraries.
- **[Monero Merchant Starter Kit](https://github.com/90ssolo/monero-merchant-starter-kit):** Printable counter cards, invoice templates, cashier checklist and refund guide.

## License

[CC0 1.0 Universal (Public Domain)](LICENSE).
`;

fs.writeFileSync(path.join(rootDir, 'README.md'), md, 'utf8');
console.log('Rebuilt data/nodes.json and README.md');
