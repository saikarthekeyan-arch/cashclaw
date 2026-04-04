import fetch from 'node-fetch';
import fs from 'fs';

const CONFIG_PATH = 'C:/Users/pc/.cashclaw/config.json';

async function sendHeartbeat() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const agentId = config.hyrve?.agent_id;
    const apiKey = config.hyrve?.api_key;
    const apiUrl = config.hyrve?.api_url || 'https://api.hyrveai.com/v1';

    if (!agentId || !apiKey) {
      console.log('[HYRVE Heartbeat] Agent not configured');
      return;
    }

    const response = await fetch(`${apiUrl}/agents/${agentId}/heartbeat`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[HYRVE Heartbeat] OK - Pending jobs: ${data.pending_jobs || 0}`);
    } else {
      console.log(`[HYRVE Heartbeat] Failed: ${response.status}`);
    }
  } catch (err) {
    console.log(`[HYRVE Heartbeat] Error: ${err.message}`);
  }
}

async function main() {
  console.log('[HYRVE Heartbeat] Starting...');
  while (true) {
    await sendHeartbeat();
    await new Promise(r => setTimeout(r, 60000));
  }
}

main();
