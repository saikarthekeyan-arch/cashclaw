import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

const CONFIG_PATH = 'C:/Users/pc/.cashclaw/config.json';
const TOKU_API = 'https://www.toku.agency/api';
const POLL_INTERVAL = 60000;

const MATCH_CATEGORIES = ['development', 'data', 'marketing', 'content', 'research', 'writing', 'seo', 'scraping', 'automation', 'python', 'analysis'];

let bidHistory = new Set();

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
    if (err) console.log('[Toku Bidder] Notification failed');
  });
}

function matchesCategory(job) {
  const searchText = `${job.title} ${job.description || ''} ${job.category || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  return MATCH_CATEGORIES.some(cat => searchText.includes(cat));
}

function formatPrice(cents) {
  if (!cents) return 'Open budget';
  return '$' + (cents / 100).toFixed(2);
}

function calculateBidAmount(budgetCents, title, description) {
  if (!budgetCents) {
    const desc = `${title} ${description || ''}`.toLowerCase();
    if (desc.includes('research') || desc.includes('analysis')) return 1500;
    if (desc.includes('automation') || desc.includes('scraping')) return 2000;
    if (desc.includes('writing') || desc.includes('content')) return 1000;
    if (desc.includes('seo')) return 1500;
    if (desc.includes('data')) return 1200;
    return 1000;
  }
  
  const budget = budgetCents / 100;
  if (budget <= 5) return Math.floor(budgetCents * 0.9);
  if (budget <= 15) return Math.floor(budgetCents * 0.85);
  if (budget <= 30) return Math.floor(budgetCents * 0.8);
  if (budget <= 50) return Math.floor(budgetCents * 0.75);
  return Math.floor(budgetCents * 0.7);
}

async function submitBid(apiKey, jobId, priceCents, title) {
  try {
    const bidMessages = [
      `Hi! I can help with "${title}". I specialize in SEO, content writing, data scraping, and automation. Looking forward to working with you!`,
      `I'd be happy to work on this task. I have experience with web scraping, automation, and content generation.`,
      `This looks like a great project! I can deliver quality work within the specified timeframe.`
    ];
    
    const message = bidMessages[Math.floor(Math.random() * bidMessages.length)];
    
    const response = await fetch(`${TOKU_API}/agents/jobs/${jobId}/bids`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: {
        priceCents: priceCents,
        message: message
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[Toku Bidder] ✓ Bid submitted: ${formatPrice(priceCents)} on "${title.substring(0, 40)}..."`);
      return true;
    } else {
      const data = await response.json();
      console.log(`[Toku Bidder] ✗ Bid failed: ${JSON.stringify(data).substring(0, 100)}`);
      return false;
    }
  } catch (err) {
    console.log(`[Toku Bidder] ✗ Error: ${err.message}`);
    return false;
  }
}

async function checkAndBid() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    
    if (!config.toku?.enabled) {
      console.log('[Toku Bidder] Toku not enabled');
      return;
    }
    
    if (!config.toku?.api_key) {
      console.log('[Toku Bidder] No Toku API key');
      return;
    }
    
    const apiKey = config.toku.api_key;
    const maxBidCents = (config.toku.max_bid_usd || 50) * 100;
    
    console.log('[Toku Bidder] Checking for jobs...');
    
    const response = await fetch(`${TOKU_API}/agents/jobs`);
    
    if (!response.ok) {
      console.log('[Toku Bidder] API error:', response.status);
      return;
    }
    
    const data = await response.json();
    const jobs = data.jobPosts || data.jobs || [];
    
    if (jobs.length === 0) {
      console.log('[Toku Bidder] No open jobs');
      return;
    }
    
    let newBids = 0;
    let skippedAlreadyBid = 0;
    
    for (const job of jobs) {
      if (!matchesCategory(job)) continue;
      if (job.status !== 'OPEN') continue;
      
      const budgetCents = job.budgetCents || 0;
      if (budgetCents > maxBidCents && budgetCents > 0) {
        continue;
      }
      
      if (bidHistory.has(job.id)) {
        skippedAlreadyBid++;
        continue;
      }
      
      const bidAmount = calculateBidAmount(budgetCents, job.title, job.description);
      
      if (bidAmount > maxBidCents) continue;
      
      const success = await submitBid(apiKey, job.id, bidAmount, job.title);
      
      if (success) {
        bidHistory.add(job.id);
        newBids++;
        
        showNotification(
          'Toku Bid Submitted!',
          `"${job.title.substring(0, 50)}..." - ${formatPrice(bidAmount)}`
        );
        
        await new Promise(r => setTimeout(r, 2000));
      } else {
        const failedReason = 'already bid or deadline passed';
        if (failedReason) bidHistory.add(job.id);
      }
    }
    
    if (newBids > 0) {
      console.log(`[Toku Bidder] ✓ Submitted ${newBids} bids`);
    } else if (skippedAlreadyBid > 0) {
      console.log(`[Toku Bidder] Already bid on ${skippedAlreadyBid} jobs`);
    }
    
  } catch (err) {
    console.log('[Toku Bidder] Error:', err.message);
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('  Toku Auto-Bidder');
  console.log('='.repeat(50));
  console.log();
  console.log('[Toku Bidder] Starting...');
  console.log('[Toku Bidder] Will auto-bid on matching jobs');
  console.log('[Toku Bidder] Categories:', MATCH_CATEGORIES.join(', '));
  console.log();
  
  showNotification('Toku Auto-Bidder', 'Starting job monitoring and auto-bidding');
  
  await checkAndBid();
  
  setInterval(checkAndBid, POLL_INTERVAL);
}

main();
