import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

const CONFIG_PATH = 'C:/Users/pc/.cashclaw/config.json';
const POLL_INTERVAL = 60000;

const GIG_SERVICES = {
  'seo_audit': { name: 'SEO Audit', search: 'seo audit service' },
  'content_writing': { name: 'Content Writing', search: 'article writing blog' },
  'lead_generation': { name: 'Lead Generation', search: 'lead generation b2b' },
  'data_scraping': { name: 'Web Scraping', search: 'web scraping data extraction' },
  'competitor_analysis': { name: 'Competitor Analysis', search: 'competitor research analysis' },
  'landing_page': { name: 'Landing Page', search: 'landing page copywriting' }
};

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

async function fetch(url, options = {}) {
  const https = await import('node:https');
  
  return new Promise((resolve, reject) => {
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      }
    };
    
    const req = https.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: () => body
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function checkBuyerRequests() {
  console.log('[Fiverr Monitor] Checking buyer requests...');
  
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const gigLinks = config.fiverr?.gig_links || {};
    
    console.log('[Fiverr Monitor] Your gigs:');
    const gigs = Object.entries(gigLinks);
    
    if (gigs.length === 0) {
      console.log('[Fiverr Monitor] No gig links configured');
      console.log('[Fiverr Monitor] Add your Fiverr gig URLs to config.json');
      return;
    }
    
    let activeGigs = 0;
    let pendingOrders = 0;
    
    for (const [service, url] of gigs) {
      const serviceInfo = GIG_SERVICES[service] || { name: service };
      console.log(`  - ${serviceInfo.name}: ${url !== 'https://www.fiverr.com/your-username/' + service ? 'Configured' : 'NEEDS SETUP'}`);
      
      if (!url.includes('your-username')) {
        activeGigs++;
      }
    }
    
    console.log(`[Fiverr Monitor] Summary: ${activeGigs}/${gigs.length} gigs configured`);
    
    if (activeGigs > 0) {
      showNotification(
        'Fiverr Monitor',
        `${activeGigs} gigs active, ready to receive orders`
      );
    }
    
  } catch (err) {
    console.log('[Fiverr Monitor] Error:', err.message);
  }
}

function printInstructions() {
  console.log();
  console.log('='.repeat(50));
  console.log('  FIVERR SETUP GUIDE');
  console.log('='.repeat(50));
  console.log();
  console.log('1. Go to https://www.fiverr.com and create an account');
  console.log('2. Create gigs for your services:');
  console.log('   - SEO Audit ($9-$59)');
  console.log('   - Content Writing ($5-$12)');
  console.log('   - Lead Generation ($9-$25)');
  console.log('   - Web Scraping ($9-$25)');
  console.log('   - Competitor Analysis ($19-$49)');
  console.log('   - Landing Page Copy ($15-$39)');
  console.log();
  console.log('3. Copy your gig URLs');
  console.log('4. Update ~/.cashclaw/config.json with your gig links');
  console.log();
  console.log('Example config:');
  console.log('  "fiverr": {');
  console.log('    "username": "your-username",');
  console.log('    "gig_links": {');
  console.log('      "seo_audit": "https://www.fiverr.com/your-username/do-seo-audit"');
  console.log('    }');
  console.log('  }');
  console.log();
}

async function main() {
  console.log('='.repeat(50));
  console.log('  Fiverr Gig Monitor');
  console.log('='.repeat(50));
  console.log();
  
  await checkBuyerRequests();
  printInstructions();
  
  setInterval(checkBuyerRequests, POLL_INTERVAL);
}

main();
