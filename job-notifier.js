import fetch from 'node-fetch';
import fs from 'fs';
import { exec } from 'child_process';

const CONFIG_PATH = 'C:/Users/pc/.cashclaw/config.json';
const POLL_INTERVAL = 60000; // 60 seconds

let lastJobCount = 0;

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
    if (err) console.log('[Notification] Fallback to console');
  });
}

async function checkJobs() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const apiUrl = config.hyrve?.api_url || 'https://api.hyrveai.com/v1';

    const response = await fetch(`${apiUrl}/jobs?limit=50`, {
      headers: {
        'X-API-Key': config.hyrve?.api_key || '',
      }
    });

    if (response.ok) {
      const data = await response.json();
      const jobs = data.jobs || [];
      
      if (jobs.length > lastJobCount && lastJobCount > 0) {
        const newJobs = jobs.length - lastJobCount;
        showNotification(
          'New Jobs Available!',
          `${jobs.length} jobs matching your services`
        );
        console.log(`[Job Alert] ${jobs.length} jobs available!`);
      }
      
      lastJobCount = jobs.length;
      
      if (jobs.length > 0) {
        console.log(`[Job Monitor] ${jobs.length} jobs available`);
      }
    }
  } catch (err) {
    console.log(`[Job Monitor] Error: ${err.message}`);
  }
}

async function main() {
  console.log('[Job Monitor] Starting...');
  console.log('[Job Monitor] Will notify on new jobs');
  
  // Check immediately
  await checkJobs();
  
  // Then poll
  setInterval(checkJobs, POLL_INTERVAL);
}

main();
