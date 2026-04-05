import fs from 'fs';
import { loadConfig } from '../cli/utils/config.js';

const TOKU_API = 'https://www.toku.agency/api';

/**
 * Fetch wrapper for Toku API
 */
async function fetchToku(endpoint, options = {}) {
  const config = await loadConfig();
  const apiKey = config.toku?.api_key;
  
  const https = await import('node:https');
  
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, TOKU_API);
    const data = options.body ? JSON.stringify(options.body) : null;
    
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        ...options.headers
      }
    };
    
    const req = https.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => JSON.parse(body)
          });
        } catch (e) {
          resolve({ ok: false, status: 500, text: () => body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/**
 * Get agent profile from Toku
 */
export async function getTokuProfile() {
  try {
    const response = await fetchToku('/api/agents/me');
    if (response.ok) {
      const data = await response.json();
      return { success: true, profile: data.agent };
    }
    return { success: false, message: 'Failed to fetch profile' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Get open jobs from Toku
 */
export async function getTokuJobs() {
  try {
    const response = await fetchToku('/api/agents/jobs');
    if (response.ok) {
      const data = await response.json();
      return { success: true, jobs: data.jobPosts || data.jobs || [], total: data.total || 0 };
    }
    return { success: false, jobs: [], total: 0 };
  } catch (err) {
    return { success: false, jobs: [], total: 0, message: err.message };
  }
}

/**
 * Get agent's bids from Toku
 */
export async function getTokuBids() {
  try {
    const response = await fetchToku('/api/jobs');
    if (response.ok) {
      const data = await response.json();
      return { success: true, bids: data.bids || data.data || [], total: data.total || 0 };
    }
    return { success: false, bids: [], total: 0 };
  } catch (err) {
    return { success: false, bids: [], total: 0, message: err.message };
  }
}

/**
 * Get agent's wallet from Toku
 */
export async function getTokuWallet() {
  try {
    const response = await fetchToku('/api/agents/wallet');
    if (response.ok) {
      const data = await response.json();
      return { success: true, wallet: data };
    }
    return { success: false, message: 'Failed to fetch wallet' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Get agent's services from Toku
 */
export async function getTokuServices() {
  try {
    const response = await fetchToku('/api/services');
    if (response.ok) {
      const data = await response.json();
      return { success: true, services: data.data || data.services || [], total: data.total || 0 };
    }
    return { success: false, services: [], total: 0 };
  } catch (err) {
    return { success: false, services: [], total: 0, message: err.message };
  }
}

/**
 * Get Toku status
 */
export async function getTokuStatus() {
  const config = await loadConfig();
  return {
    registered: config.toku?.registered || false,
    agent_id: config.toku?.agent_id || null,
    api_key_set: !!config.toku?.api_key,
    enabled: config.toku?.enabled || false,
    auto_bid: config.toku?.auto_bid || false,
    dashboard_url: config.toku?.dashboard_url || null,
    api_url: TOKU_API,
  };
}

export function getBidHistory() {
  const BID_HISTORY_PATH = 'C:/Users/pc/.cashclaw/toku-bids.json';
  try {
    if (fs.existsSync(BID_HISTORY_PATH)) {
      return JSON.parse(fs.readFileSync(BID_HISTORY_PATH, 'utf-8'));
    }
  } catch (e) {}
  return { bids: {}, wonJobs: [] };
}
