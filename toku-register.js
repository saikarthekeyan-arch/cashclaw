import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

const CONFIG_PATH = 'C:/Users/pc/.cashclaw/config.json';
const TOKU_API = 'https://www.toku.agency/api';

const agentData = {
  name: 'MyCashClaw',
  description: 'AI agent specializing in SEO audits, content writing, lead generation, data scraping, social media management, and digital marketing services. Provides high-quality deliverables with fast turnaround.',
  ownerEmail: 'saikarthekeyan-arch@github.com',
  tags: ['seo', 'content', 'writing', 'lead-generation', 'data-scraping', 'marketing', 'social-media', 'research']
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

async function register() {
  console.log('[Toku Register] Starting registration...');
  
  try {
    const response = await fetch(`${TOKU_API}/agents/register`, {
      method: 'POST',
      body: agentData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('[Toku Register] SUCCESS!');
      console.log('[Toku Register] Agent ID:', data.agent?.id);
      console.log('[Toku Register] API Key:', data.agent?.apiKey?.substring(0, 20) + '...');
      console.log('[Toku Register] Status:', data.agent?.status);
      
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      config.toku = {
        api_key: data.agent?.apiKey,
        agent_id: data.agent?.id,
        enabled: true,
        notify_only: true,
        categories: ['development', 'data', 'marketing', 'content', 'research'],
        registered: true,
        dashboard_url: `https://www.toku.agency/agents/${data.agent?.id}`
      };
      
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log('[Toku Register] Saved to config.json');
      
      return data.agent;
    } else {
      console.log('[Toku Register] FAILED:', JSON.stringify(data));
      return null;
    }
  } catch (err) {
    console.log('[Toku Register] ERROR:', err.message);
    return null;
  }
}

async function createServices(apiKey) {
  console.log('[Toku Register] Creating services...');
  
  const services = [
    { title: 'SEO Audit', description: 'Comprehensive SEO audit with recommendations', category: 'marketing', tags: ['seo', 'audit'], price: 900, delivery: 1 },
    { title: 'Content Writing', description: 'Professional blog posts and articles', category: 'content', tags: ['writing', 'content'], price: 500, delivery: 1 },
    { title: 'Lead Generation', description: 'B2B lead lists with contact info', category: 'data', tags: ['leads', 'sales'], price: 900, delivery: 1 },
    { title: 'Web Data Scraping', description: 'Extract structured data from websites', category: 'data', tags: ['scraping', 'data'], price: 900, delivery: 1 }
  ];
  
  for (const svc of services) {
    try {
      const response = await fetch(`${TOKU_API}/services`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: {
          title: svc.title,
          description: svc.description,
          category: svc.category,
          tags: svc.tags,
          tiers: [
            { name: 'Basic', description: 'Standard delivery', priceCents: svc.price, deliveryDays: svc.delivery }
          ]
        }
      });
      
      if (response.ok) {
        console.log(`[Toku Register] + ${svc.title}`);
      }
    } catch (err) {
      console.log(`[Toku Register] Failed: ${svc.title}`);
    }
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('  Toku Agency Registration');
  console.log('='.repeat(50));
  console.log();
  
  const agent = await register();
  
  if (agent && agent.apiKey) {
    await createServices(agent.apiKey);
    console.log();
    console.log('='.repeat(50));
    console.log('  REGISTRATION COMPLETE!');
    console.log('='.repeat(50));
    console.log();
    console.log('Dashboard: https://www.toku.agency/agents/' + agent.id);
  }
}

main();
