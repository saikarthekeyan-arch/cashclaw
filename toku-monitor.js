import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

const CONFIG_PATH = 'C:/Users/pc/.cashclaw/config.json';
const TOKU_API = 'https://www.toku.agency/api';
const POLL_INTERVAL = 60000;
const MATCH_CATEGORIES = ['development', 'data', 'marketing', 'content', 'research', 'writing', 'seo', 'scraping'];

let lastJobCount = 0;

async function fetch(url, options = {}) {
  const https = await import('node:https');
  
  return new Promise((resolve, reject) => {
    const data = options.body ? JSON.stringify(options.body) : null;
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
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

function showNotification(title, message) {
  const ps = `
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
    $template = @"
    <toast>
      <visual>
        <binding template="ToastText02">
          <text id="1">${title}</text>
          <text id="2">${message}</text>
        </binding>
      </visual>
      <audio src="ms-winsoundevent:Notification.Default"/>
    </toast>
"@
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($template)
    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("CashClaw").Show($toast)
  `;
  
  const { exec } = require('child_process');
  exec(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, (err) => {
    if (err) console.log('[Toku Monitor] Notification failed');
  });
}

function matchesCategory(job) {
  const searchText = `${job.title} ${job.description} ${job.category || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  return MATCH_CATEGORIES.some(cat => searchText.includes(cat));
}

function formatPrice(cents) {
  return '$' + (cents / 100).toFixed(2);
}

async function checkJobs() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    
    if (!config.toku?.enabled) {
      console.log('[Toku Monitor] Toku not enabled in config');
      return;
    }
    
    console.log('[Toku Monitor] Checking for jobs...');
    
    const response = await fetch(`${TOKU_API}/agents/jobs`);
    
    if (!response.ok) {
      console.log('[Toku Monitor] API error:', response.status);
      return;
    }
    
    const data = await response.json();
    const jobs = data.jobPosts || data.jobs || [];
    
    if (jobs.length === 0) {
      console.log('[Toku Monitor] No open jobs');
      return;
    }
    
    const matchingJobs = jobs.filter(matchesCategory);
    
    if (matchingJobs.length > lastJobCount && lastJobCount > 0) {
      const newCount = matchingJobs.length - lastJobCount;
      showNotification(
        'New Toku Jobs!',
        `${matchingJobs.length} jobs matching your skills`
      );
    }
    
    lastJobCount = matchingJobs.length;
    
    if (matchingJobs.length > 0) {
      console.log(`[Toku Monitor] Found ${matchingJobs.length} matching jobs:`);
      matchingJobs.slice(0, 5).forEach(job => {
        const price = job.budgetCents ? formatPrice(job.budgetCents) : 'Open budget';
        const bids = job.bidCount || 0;
        console.log(`  - ${job.title} (${price}) [${bids} bids]`);
      });
      
      if (matchingJobs.length > 5) {
        console.log(`  ... and ${matchingJobs.length - 5} more`);
      }
    }
    
  } catch (err) {
    console.log('[Toku Monitor] Error:', err.message);
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('  Toku Job Monitor');
  console.log('='.repeat(50));
  console.log();
  console.log('[Toku Monitor] Starting...');
  console.log('[Toku Monitor] Categories:', MATCH_CATEGORIES.join(', '));
  console.log('[Toku Monitor] Poll interval:', POLL_INTERVAL / 1000, 'seconds');
  console.log();
  
  await checkJobs();
  
  setInterval(checkJobs, POLL_INTERVAL);
}

main();
