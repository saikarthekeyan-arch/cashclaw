import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

const API_KEY = 'cmnldvvm00005jp04usty09ef';
const TOKU_API = 'https://www.toku.agency/api';

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

const services = [
  {
    title: 'SEO Audit',
    description: 'Comprehensive SEO audit with actionable recommendations for improving search rankings and organic traffic.',
    category: 'marketing',
    tags: ['seo', 'audit', 'optimization', 'search'],
    tiers: [
      { name: 'Basic', description: 'Single page audit', priceCents: 900, deliveryDays: 1, features: ['On-page SEO check', 'Meta tags review', 'Basic recommendations'] },
      { name: 'Standard', description: 'Full site audit up to 50 pages', priceCents: 2900, deliveryDays: 3, features: ['Full site analysis', 'Keyword research', 'Competitor comparison', 'Action plan'] },
      { name: 'Premium', description: 'Comprehensive audit with competitor analysis', priceCents: 5900, deliveryDays: 5, features: ['Complete SEO audit', 'Competitor analysis', 'Content strategy', 'Implementation guide'] }
    ]
  },
  {
    title: 'Content Writing',
    description: 'Professional blog posts, articles, newsletters, and website copy written by AI.',
    category: 'content',
    tags: ['content', 'writing', 'copywriting', 'blog'],
    tiers: [
      { name: 'Basic', description: '500-word post', priceCents: 500, deliveryDays: 1, features: ['SEO-optimized content', '1 revision', 'Meta description'] },
      { name: 'Standard', description: '1500-word article', priceCents: 1200, deliveryDays: 2, features: ['In-depth article', 'Research included', '2 revisions', 'Images suggestions'] },
      { name: 'Premium', description: 'Newsletter with subject line options', priceCents: 900, deliveryDays: 1, features: ['3 subject lines', 'Full newsletter', 'CTA included', 'Mobile optimized'] }
    ]
  },
  {
    title: 'Lead Generation',
    description: 'Targeted B2B lead lists with verified contact information for outreach campaigns.',
    category: 'data',
    tags: ['leads', 'prospecting', 'b2b', 'sales'],
    tiers: [
      { name: 'Starter', description: '25 leads with basic info', priceCents: 900, deliveryDays: 1, features: ['25 verified leads', 'Name & company', 'Email included', 'CSV format'] },
      { name: 'Standard', description: '50 leads with full contact info', priceCents: 1500, deliveryDays: 2, features: ['50 verified leads', 'Full contact info', 'Company data', 'LinkedIn URLs'] },
      { name: 'Premium', description: '100 leads with enrichment data', priceCents: 2500, deliveryDays: 3, features: ['100 enriched leads', 'Tech stack data', 'Social profiles', 'Export ready'] }
    ]
  },
  {
    title: 'Web Data Scraping',
    description: 'Extract structured data from websites and APIs, delivered in clean CSV/JSON formats.',
    category: 'data',
    tags: ['scraping', 'data', 'extraction', 'api'],
    tiers: [
      { name: 'Basic', description: 'Single source, up to 50 records', priceCents: 900, deliveryDays: 1, features: ['Single website', '50 records', 'Clean CSV/JSON', 'Error handling'] },
      { name: 'Standard', description: 'Multiple sources, up to 200 records', priceCents: 1900, deliveryDays: 2, features: ['Multiple sources', '200 records', 'Deduplication', 'Data cleaning'] },
      { name: 'Premium', description: 'Multi-source with enrichment, 500 records', priceCents: 2500, deliveryDays: 3, features: ['500+ records', 'Data enrichment', 'API integration', 'Custom format'] }
    ]
  },
  {
    title: 'Social Media Management',
    description: 'Content creation and scheduling for social media platforms.',
    category: 'marketing',
    tags: ['social-media', 'content', 'scheduling'],
    tiers: [
      { name: 'Weekly', description: '1 platform, 4 posts', priceCents: 900, deliveryDays: 7, features: ['4 custom posts', 'Hashtag research', 'Optimal timing', 'Content calendar'] },
      { name: 'Pro', description: '3 platforms, 12 posts', priceCents: 1900, deliveryDays: 7, features: ['12 posts total', '3 platforms', 'Engagement strategy', 'Analytics report'] },
      { name: 'Full', description: 'All platforms, 20 posts + analytics', priceCents: 4900, deliveryDays: 7, features: ['20 posts', 'Full management', 'Monthly analytics', 'Growth strategy'] }
    ]
  },
  {
    title: 'Email Outreach Campaigns',
    description: 'Cold email sequences, template creation, and outreach campaign management.',
    category: 'marketing',
    tags: ['email', 'outreach', 'cold-email', 'campaigns'],
    tiers: [
      { name: 'Basic', description: '5 email templates', priceCents: 900, deliveryDays: 1, features: ['5 templates', 'Subject lines', 'Follow-up emails', 'A/B suggestions'] },
      { name: 'Standard', description: 'Full sequence with follow-ups', priceCents: 1900, deliveryDays: 2, features: ['10-email sequence', 'Follow-up chain', 'Personalization tips', 'Timing guide'] },
      { name: 'Premium', description: 'Campaign setup + 100 emails', priceCents: 2900, deliveryDays: 3, features: ['Complete campaign', '100 personalized emails', 'Tracking setup', 'Optimization tips'] }
    ]
  },
  {
    title: 'Competitor Analysis',
    description: 'In-depth competitor research with market insights and strategic recommendations.',
    category: 'research',
    tags: ['competitor', 'analysis', 'market-research'],
    tiers: [
      { name: 'Basic', description: '3 competitor profiles', priceCents: 1900, deliveryDays: 2, features: ['3 competitor profiles', 'Strengths analysis', 'SWOT overview', 'Market positioning'] },
      { name: 'Standard', description: '5 competitors with SWOT', priceCents: 3500, deliveryDays: 3, features: ['5 detailed profiles', 'Full SWOT analysis', 'Pricing strategy', 'Opportunity mapping'] },
      { name: 'Premium', description: 'Full analysis with action plan', priceCents: 4900, deliveryDays: 5, features: ['Comprehensive report', 'Action plan included', 'Competitive pricing', 'Monthly updates'] }
    ]
  },
  {
    title: 'Landing Page Copy',
    description: 'High-converting landing page copy and HTML generation.',
    category: 'content',
    tags: ['landing-page', 'copywriting', 'conversion'],
    tiers: [
      { name: 'Basic', description: 'Single landing page copy', priceCents: 1500, deliveryDays: 1, features: ['Compelling headline', 'Benefit-focused copy', 'CTA optimization', 'SEO friendly'] },
      { name: 'Standard', description: 'Copy + basic HTML', priceCents: 2900, deliveryDays: 2, features: ['Full page copy', 'Responsive HTML', 'Form integration', 'Mobile optimized'] },
      { name: 'Premium', description: 'Full page with A/B variants', priceCents: 3900, deliveryDays: 3, features: ['Multiple variants', 'A/B copy options', 'Conversion tips', 'Implementation guide'] }
    ]
  }
];

async function createServices() {
  console.log('Creating services on Toku Agency...\n');
  
  let created = 0;
  for (const svc of services) {
    try {
      console.log(`Creating: ${svc.title}...`);
      const response = await fetch(`${TOKU_API}/services`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        body: svc
      });
      
      if (response.ok) {
        console.log(`  ✓ Created: ${svc.title}`);
        created++;
      } else {
        const data = await response.json();
        console.log(`  ✗ Failed: ${JSON.stringify(data)}`);
      }
      
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
    }
  }
  
  console.log(`\n✓ Created ${created}/${services.length} services`);
}

createServices();
