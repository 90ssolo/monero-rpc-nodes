import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const data = yaml.load(fs.readFileSync(path.join(rootDir, 'data', 'nodes.yaml'), 'utf8'));
const clearnetNodes = data.nodes.filter(n => n.transport === 'clearnet');

async function rpcCall(url, method, timeoutMs = 7000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(`${url}/json_rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: '0', method }),
      signal: ctrl.signal
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const cors = res.headers.get('access-control-allow-origin') || 'None';
    const json = await res.json();
    if (!json?.result || json.result.status !== 'OK') {
      return { ok: false, error: 'Invalid JSON-RPC response' };
    }
    return { ok: true, latencyMs, cors, result: json.result };
  } catch (err) {
    return { ok: false, error: err.cause?.code || err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function probeNode(node) {
  const info = await rpcCall(node.url, 'get_info');
  if (!info.ok) return { node, ok: false, error: info.error };

  const r = info.result;
  const reportedNet = r.nettype || (r.mainnet ? 'mainnet' : r.stagenet ? 'stagenet' : 'testnet');
  if (reportedNet !== node.network) {
    return { node, ok: false, error: `Network mismatch! Expected ${node.network}, got ${reportedNet}` };
  }
  if (!r.restricted) {
    return { node, ok: false, error: 'Warning: RPC is not restricted (restricted=false)' };
  }

  const feeRes = await rpcCall(node.url, 'get_fee_estimate', 5000);
  const feePerByte = feeRes.ok ? feeRes.result.fee : null;

  return {
    node,
    ok: true,
    latencyMs: info.latencyMs,
    cors: info.cors,
    height: r.height,
    top_block_hash: r.top_block_hash,
    wide_difficulty: r.wide_difficulty,
    feePerByte
  };
}

async function main() {
  console.log(`Probing ${clearnetNodes.length} clearnet Monero RPC endpoints across Mainnet, Stagenet, and Testnet...\n`);
  const results = [];
  for (let i = 0; i < clearnetNodes.length; i += 6) {
    const batch = clearnetNodes.slice(i, i + 6);
    const batchRes = await Promise.all(batch.map(probeNode));
    results.push(...batchRes);
  }

  for (const net of ['mainnet', 'stagenet', 'testnet']) {
    const netResults = results.filter(r => r.node.network === net);
    const online = netResults.filter(r => r.ok);
    const heights = online.map(r => r.height).sort((a, b) => a - b);
    const medianHeight = heights.length ? heights[Math.floor(heights.length / 2)] : 0;

    console.log(`=== ${net.toUpperCase()} (Online: ${online.length}/${netResults.length}, Median Height: ${medianHeight}) ===`);
    for (const r of netResults) {
      if (!r.ok) {
        console.log(`  [OFFLINE] ${r.node.url} — ${r.error}`);
        continue;
      }
      const heightDelta = Math.abs(r.height - medianHeight);
      const consensusOk = heightDelta <= 3;
      const feeOk = r.feePerByte === null || (r.feePerByte > 0 && r.feePerByte < 500000);
      const badge = consensusOk && feeOk ? 'PASS' : 'WARN';
      console.log(`  [${badge}] ${r.node.url} (${r.latencyMs}ms) height=${r.height} hash=${r.top_block_hash.slice(0, 12)}... fee=${r.feePerByte ?? 'n/a'} cors=${r.cors}`);
    }
    console.log('');
  }
}

main();
