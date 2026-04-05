import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

const CONFIG_PATH = 'C:/Users/pc/.cashclaw/config.json';
const TOKU_API = 'https://www.toku.agency/api';
const BID_HISTORY_PATH = 'C:/Users/pc/.cashclaw/toku-bids.json';
const POLL_INTERVAL = 60000;

const MATCH_CATEGORIES = ['development', 'data', 'marketing', 'content', 'research', 'writing', 'seo', 'scraping', 'automation', 'python', 'analysis', 'audit', 'leads', 'social'];

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

const { exec } = require('child_process');

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
  
  exec(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, (err) => {
    if (err) console.log('[Toku Bidder] Notification failed');
  });
}

function matchesCategory(job) {
  const searchText = `${job.title} ${job.description || ''} ${job.category || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  return MATCH_CATEGORIES.some(cat => searchText.includes(cat));
}

function formatPrice(cents) {
  if (!cents && cents !== 0) return 'Open budget';
  return '$' + (cents / 100).toFixed(2);
}

function loadBidHistory() {
  try {
    if (fs.existsSync(BID_HISTORY_PATH)) {
      return JSON.parse(fs.readFileSync(BID_HISTORY_PATH, 'utf-8'));
    }
  } catch (e) {}
  return { bids: {}, wonJobs: [] };
}

function saveBidHistory(history) {
  fs.writeFileSync(BID_HISTORY_PATH, JSON.stringify(history, null, 2));
}

function getBidMessage(job) {
  const messages = [
    `Hi! I'm interested in "${job.title}". I specialize in SEO, content writing, data scraping, and automation. Can deliver quality work.`,
    `I can help with this task. Experienced in web scraping, automation, and content generation. Ready to start immediately.`,
    `This looks like a great project! I have skills in ${job.category || 'digital services'} and can deliver on time.`,
    `I'd be happy to work on this. I offer professional services in SEO, content, and data scraping at competitive rates.`
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function calculateWinningBid(job, config) {
  const maxBidCents = (config.toku?.max_bid_usd || 50) * 100;
  const budgetCents = job.budgetCents || 0;
  
  // If job has a budget, bid 70-90% of it
  if (budgetCents > 0) {
    const minBid = Math.floor(budgetCents * 0.7);
    const maxAllowed = Math.min(budgetCents - 1, maxBidCents);
    // Bid slightly lower than max allowed but above minimum
    return Math.max(minBid, Math.floor(maxAllowed * 0.8));
  }
  
  // For open budget jobs, use default pricing based on category
  const desc = `${job.title} ${job.description || ''}`.toLowerCase();
  
  if (desc.includes('scraping') || desc.includes('automation')) return Math.min(1500, maxBidCents);
  if (desc.includes('research') || desc.includes('analysis')) return Math.min(1200, maxBidCents);
  if (desc.includes('content') || desc.includes('writing')) return Math.min(800, maxBidCents);
  if (desc.includes('seo')) return Math.min(1500, maxBidCents);
  if (desc.includes('leads') || desc.includes('data')) return Math.min(1000, maxBidCents);
  
  return Math.min(500, maxBidCents); // Minimum viable bid
}

async function submitBid(apiKey, job, bidAmount, history) {
  try {
    const response = await fetch(`${TOKU_API}/agents/jobs/${job.id}/bids`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: {
        priceCents: bidAmount,
        message: getBidMessage(job)
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      history.bids[job.id] = {
        jobId: job.id,
        title: job.title,
        amount: bidAmount,
        budget: job.budgetCents,
        status: 'pending',
        bidCount: job.bidCount,
        timestamp: new Date().toISOString()
      };
      saveBidHistory(history);
      
      console.log(`[Toku Bidder] ✓ Bid $${(bidAmount/100).toFixed(2)} on "${job.title.substring(0, 40)}..."`);
      return { success: true, bid: bidAmount };
    } else {
      // Already bid or deadline passed
      if (data.error?.includes('already')) {
        history.bids[job.id] = { ...history.bids[job.id], status: 'already_bid' };
        saveBidHistory(history);
      }
      return { success: false, error: data.error };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function checkAndBidAll() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  
  if (!config.toku?.enabled || !config.toku?.api_key) {
    console.log('[Toku Bidder] Toku not enabled');
    return;
  }
  
  const apiKey = config.toku.api_key;
  const history = loadBidHistory();
  
  console.log('[Toku Bidder] Checking all jobs...');
  
  try {
    const response = await fetch(`${TOKU_API}/agents/jobs`);
    
    if (!response.ok) {
      console.log('[Toku Bidder] API error:', response.status);
      return;
    }
    
    const data = await response.json();
    const jobs = data.jobPosts || data.jobs || [];
    
    console.log(`[Toku Bidder] Found ${jobs.length} total jobs`);
    
    let newBids = 0;
    let alreadyBids = 0;
    let skipped = 0;
    
    for (const job of jobs) {
      // Skip if doesn't match our categories
      if (!matchesCategory(job)) {
        skipped++;
        continue;
      }
      
      // Skip if already bid
      if (history.bids[job.id]) {
        alreadyBids++;
        continue;
      }
      
      // Check if deadline has passed
      if (job.deadline) {
        const deadline = new Date(job.deadline);
        if (deadline < new Date()) {
          skipped++;
          continue;
        }
      }
      
      // Calculate winning bid
      const bidAmount = calculateWinningBid(job, config);
      
      // Submit bid
      const result = await submitBid(apiKey, job, bidAmount, history);
      
      if (result.success) {
        newBids++;
        showNotification(
          'Toku Bid!',
          `$${(bidAmount/100).toFixed(2)} on "${job.title.substring(0, 30)}..."`
        );
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 1500));
    }
    
    console.log(`[Toku Bidder] Summary: ${newBids} new bids, ${alreadyBids} already bid, ${skipped} skipped`);
    
    // Save updated history
    saveBidHistory(history);
    
  } catch (err) {
    console.log('[Toku Bidder] Error:', err.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Toku Smart Auto-Bidder');
  console.log('='.repeat(60));
  console.log();
  console.log('[Toku Bidder] Starting - will bid on ALL matching jobs...');
  console.log('[Toku Bidder] Categories:', MATCH_CATEGORIES.join(', '));
  console.log('[Toku Bidder] Will bid lower than competition!');
  console.log();
  
  showNotification('Toku Auto-Bidder', 'Starting - will bid on all matching jobs');
  
  // Initial bid check
  await checkAndBidAll();
  
  // Poll for new jobs
  setInterval(checkAndBidAll, POLL_INTERVAL);
}

main();
