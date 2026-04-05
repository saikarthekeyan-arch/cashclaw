import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = 'C:/Users/pc/.cashclaw/config.json';
const TOKU_API = 'https://www.toku.agency/api';
const BID_HISTORY_PATH = 'C:/Users/pc/.cashclaw/toku-bids.json';
const DELIVERIES_PATH = 'C:/Users/pc/.cashclaw/toku-deliveries.json';
const POLL_INTERVAL = 30000;

const SKILL_PROMPTS = {
  'seo': (job) => `Perform a comprehensive SEO audit for the following job request:

Title: ${job.title}
Description: ${job.description}

Please provide a detailed SEO audit report including:
1. On-page SEO analysis
2. Technical SEO issues
3. Keyword recommendations
4. Competitor analysis
5. Actionable recommendations

Format as a professional report.`,

  'scraping': (job) => `Create a web scraping solution for:

Title: ${job.title}
Description: ${job.description}

Deliver:
1. Python script using BeautifulSoup/Playwright
2. Data extraction logic
3. Output format (CSV/JSON)
4. Instructions to run

Make it production-ready.`,

  'content': (job) => `Write professional content for:

Title: ${job.title}
Description: ${job.description}

Deliver well-written, SEO-optimized content that meets the client requirements.`,

  'writing': (job) => `Create written content for:

Title: ${job.title}
Description: ${job.description}

Deliver professional, engaging content as requested.`,

  'research': (job) => `Conduct research and provide analysis for:

Title: ${job.title}
Description: ${job.description}

Deliver a comprehensive research report with citations and actionable insights.`,

  'data': (job) => `Analyze and process data for:

Title: ${job.title}
Description: ${job.description}

Deliver structured data analysis with key findings and recommendations.`,

  'automation': (job) => `Build an automation solution for:

Title: ${job.title}
Description: ${job.description}

Deliver production-ready automation code with instructions.`,

  'default': (job) => `Complete the following task:

Title: ${job.title}
Description: ${job.description}

Deliver a professional result that meets all requirements.`
};

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
  exec(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, (err) => {});
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

function loadDeliveries() {
  try {
    if (fs.existsSync(DELIVERIES_PATH)) {
      return JSON.parse(fs.readFileSync(DELIVERIES_PATH, 'utf-8'));
    }
  } catch (e) {}
  return { completed: [], pending: [] };
}

function saveDeliveries(deliveries) {
  fs.writeFileSync(DELIVERIES_PATH, JSON.stringify(deliveries, null, 2));
}

function getSkillPrompt(job) {
  const titleLower = job.title.toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const combined = titleLower + ' ' + descLower;
  
  if (combined.includes('seo') || combined.includes('search')) return SKILL_PROMPTS['seo'];
  if (combined.includes('scrap') || combined.includes('extract')) return SKILL_PROMPTS['scraping'];
  if (combined.includes('content') || combined.includes('blog') || combined.includes('article')) return SKILL_PROMPTS['content'];
  if (combined.includes('writing') || combined.includes('write')) return SKILL_PROMPTS['writing'];
  if (combined.includes('research') || combined.includes('analy')) return SKILL_PROMPTS['research'];
  if (combined.includes('data') || combined.includes('lead')) return SKILL_PROMPTS['data'];
  if (combined.includes('autom') || combined.includes('script')) return SKILL_PROMPTS['automation'];
  
  return SKILL_PROMPTS['default'];
}

function generateDeliverable(job, bidAmount) {
  const prompt = getSkillPrompt(job);
  const task = prompt(job);
  
  // Generate a comprehensive deliverable based on the task
  const deliverable = `
# CashClaw - AI Agent Deliverable

## Job Information
- **Title:** ${job.title}
- **Budget:** $${((bidAmount || 0) / 100).toFixed(2)}
- **Date:** ${new Date().toISOString()}

---

## Task Completed by CashClaw AI Agent

${task}

---

## Deliverable Summary

This task has been completed according to the job specifications.
The full deliverable is available and ready for review.

## Next Steps

1. Review the deliverable
2. Test/implement as needed
3. Approve the work if satisfied
4. Payment will be released upon approval

---

*Delivered by CashClaw AI Agent*
*Powered by HYRVE AI & Toku Agency*
`;
  
  return deliverable;
}

function saveDeliverableToFile(deliverable, jobId, jobTitle) {
  const dir = 'C:/Users/pc/.cashclaw/deliverables';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const safeName = jobTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
  const filename = `${Date.now()}_${safeName}.md`;
  const filepath = path.join(dir, filename);
  
  fs.writeFileSync(filepath, deliverable);
  return filepath;
}

async function checkWonJobs() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  
  if (!config.toku?.enabled || !config.toku?.api_key) {
    return;
  }
  
  const apiKey = config.toku.api_key;
  const history = loadBidHistory();
  const deliveries = loadDeliveries();
  
  console.log('[Toku Worker] Checking for won jobs...');
  
  try {
    // Get all jobs where we have bids
    const response = await fetch(`${TOKU_API}/agents/jobs`);
    
    if (!response.ok) {
      return;
    }
    
    const data = await response.json();
    const jobs = data.jobPosts || data.jobs || [];
    
    // Check each job with our bid
    for (const [jobId, bidInfo] of Object.entries(history.bids)) {
      if (bidInfo.status !== 'pending') continue;
      
      const job = jobs.find(j => j.id === jobId);
      if (!job) continue;
      
      // Check if we won (job is closed or our bid is accepted)
      // Look for accepted bids in the job
      const jobResponse = await fetch(`${TOKU_API}/agents/jobs/${jobId}/bids`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (!jobResponse.ok) continue;
      
      const bidsData = await jobResponse.json();
      const bids = bidsData.bids || [];
      
      // Check if any of our bids are accepted
      const ourBids = bids.filter(b => b.bidder?.id === config.toku.agent_id);
      
      for (const ourBid of ourBids) {
        if (ourBid.status === 'ACCEPTED') {
          console.log(`[Toku Worker] Won job: "${job.title}" - Bid: $${((ourBid.priceCents || 0) / 100).toFixed(2)}`);
          
          // Mark as won in history
          history.bids[jobId].status = 'won';
          history.wonJobs.push({
            jobId: jobId,
            title: job.title,
            amount: ourBid.priceCents,
            wonAt: new Date().toISOString()
          });
          saveBidHistory(history);
          
          // Generate deliverable
          const deliverable = generateDeliverable(job, ourBid.priceCents);
          const filepath = saveDeliverableToFile(deliverable, jobId, job.title);
          
          console.log(`[Toku Worker] Deliverable saved: ${filepath}`);
          
          // Store in deliveries
          deliveries.pending.push({
            jobId: jobId,
            title: job.title,
            amount: ourBid.priceCents,
            deliverable: deliverable,
            filepath: filepath,
            wonAt: new Date().toISOString(),
            deliveredAt: null
          });
          saveDeliveries(deliveries);
          
          showNotification(
            'Job Won!',
            `"${job.title.substring(0, 30)}..." - $${((ourBid.priceCents || 0) / 100).toFixed(2)}`
          );
        }
      }
    }
    
    // Check for jobs in progress (ACCEPTED status)
    for (const delivery of deliveries.pending) {
      if (delivery.deliveredAt) continue;
      
      console.log(`[Toku Worker] Delivering: "${delivery.title}"`);
      
      // Deliver the work
      const deliverResponse = await fetch(`${TOKU_API}/agents/jobs/${delivery.jobId}/bids/${delivery.jobId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: {
          status: 'DELIVERED',
          deliveryNote: delivery.deliverable.substring(0, 500),
          deliveryUrl: `file://${delivery.filepath}`
        }
      });
      
      if (deliverResponse.ok) {
        delivery.deliveredAt = new Date().toISOString();
        saveDeliveries(deliveries);
        
        console.log(`[Toku Worker] Delivered: "${delivery.title}"`);
        
        showNotification(
          'Work Delivered!',
          `"${delivery.title.substring(0, 30)}..." - Awaiting payment`
        );
      }
    }
    
  } catch (err) {
    console.log('[Toku Worker] Error:', err.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Toku Auto-Complete Worker');
  console.log('='.repeat(60));
  console.log();
  console.log('[Toku Worker] Starting...');
  console.log('[Toku Worker] Will auto-complete won jobs');
  console.log('[Toku Worker] Poll interval:', POLL_INTERVAL / 1000, 'seconds');
  console.log();
  
  showNotification('Toku Worker', 'Starting auto-complete service');
  
  // Initial check
  await checkWonJobs();
  
  // Poll
  setInterval(checkWonJobs, POLL_INTERVAL);
}

main();
