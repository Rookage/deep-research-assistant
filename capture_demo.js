const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const outDir = path.join(__dirname, 'demo');
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Empty state / homepage
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outDir, '01-home.png'), fullPage: true });
  console.log('1/4 Home captured');

  // 2. Start a research — type topic and click start
  const textarea = await page.$('#topicInput');
  if (textarea) {
    await textarea.type('中国新能源汽车出口欧洲市场前景如何？', { delay: 30 });
    await new Promise(r => setTimeout(r, 500));
  }
  const startBtn = await page.$('#startBtn');
  if (startBtn) {
    await startBtn.click();
    await new Promise(r => setTimeout(r, 8000)); // Wait for AI response
  }
  await page.screenshot({ path: path.join(outDir, '02-interview.png'), fullPage: true });
  console.log('2/4 Interview captured');

  // 3. Respond to AI question to advance
  const msgInput = await page.$('#messageInput');
  if (msgInput) {
    await msgInput.type('我想了解市场前景、竞争格局和政策风险，报告面向投资人，需要深度分析。', { delay: 20 });
    await new Promise(r => setTimeout(r, 500));
    const sendBtn = await page.$('#sendBtn');
    if (sendBtn) await sendBtn.click();
    await new Promise(r => setTimeout(r, 8000));
  }
  await page.screenshot({ path: path.join(outDir, '03-clarify.png'), fullPage: true });
  console.log('3/4 Clarify captured');

  // 4. Show available sessions / sidebar
  // Go back to home and navigate
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outDir, '04-sessions.png'), fullPage: true });
  console.log('4/4 Sessions captured');

  await browser.close();
  console.log('Done!', outDir);
})();
