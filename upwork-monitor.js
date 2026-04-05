import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

const CONFIG_PATH = 'C:/Users/pc/.cashclaw/config.json';
const POLL_INTERVAL = 60000;

const UPWORK_API = 'https://www.upwork.com/api/v3';
const MATCH_SKILLS = ['seo', 'content', 'writing', 'data', 'scraping', 'automation', 'web', 'api', 'python', 'javascript', 'marketing', 'research', 'analysis', 'lead', 'social'];

let bidHistory = new Set();

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
  exec(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, (err) => {});
}

function matchesSkills(job) {
  const searchText = `${job.title || ''} ${job.description || ''} ${(job.skills || []).join(' ')}`.toLowerCase();
  return MATCH_SKILLS.some(skill => searchText.includes(skill));
}

function formatPrice(budget) {
  if (!budget) return 'Fixed';
  if (budget.type === 'fixed') return `$${budget.amount?.toFixed(0) || 0}`;
  if (budget.type === 'hourly') return `$${budget.amount?.toFixed(0)}/hr`;
  return 'Fixed';
}

function calculateBid(budget) {
  if (!budget || !budget.amount) return 50;
  if (budget.type === 'fixed') {
    return Math.min(budget.amount * 0.8, 200);
  }
  return Math.min(budget.amount * 0.9, 50);
}

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

async function fetchJobs() {
  console.log('[Upwork Monitor] Fetching jobs...');
  
  try {
    // Upwork public jobs feed (no auth required for browse)
    const response = await fetch(`${UPWORK_API}/jobs/search.json?q=web+scraping&category2=web_mobile_software_development&sort=create_time_desc`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[Upwork Monitor] Found ${data.jobs?.length || 0} jobs`);
      return data.jobs || [];
    }
  } catch (err) {
    console.log('[Upwork Monitor] Error:', err.message);
  }
  
  return [];
}

async function checkJobs() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    
    if (!config.upwork?.enabled) {
      return;
    }
    
    console.log('[Upwork Monitor] Checking for jobs...');
    
    const jobs = await fetchJobs();
    const matchingJobs = jobs.filter(matchesSkills).slice(0, 10);
    
    if (matchingJobs.length > 0) {
      console.log(`[Upwork Monitor] Found ${matchingJobs.length} matching jobs:`);
      matchingJobs.forEach(job => {
        console.log(`  - ${job.title?.substring(0, 60)} (${formatPrice(job.budget)})`);
      });
      
      showNotification(
        'Upwork Jobs!',
        `${matchingJobs.length} jobs matching your skills`
      );
    } else {
      console.log('[Upwork Monitor] No matching jobs found');
    }
    
  } catch (err) {
    console.log('[Upwork Monitor] Error:', err.message);
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('  Upwork Job Monitor');
  console.log('='.repeat(50));
  console.log();
  console.log('[Upwork Monitor] Starting...');
  console.log('[Upwork Monitor] Skills:', MATCH_SKILLS.join(', '));
  console.log();
  
  showNotification('Upwork Monitor', 'Starting job monitoring');
  
  await checkJobs();
  
  setInterval(checkJobs, POLL_INTERVAL);
}

main();
