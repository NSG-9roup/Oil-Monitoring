const { chromium } = require('playwright');
(async () => {
  console.log('Starting Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  page.on('response', response => {
    if ([301, 302, 307, 308].includes(response.status())) {
      console.log('Redirect:', response.url(), '->', response.headers()['location']);
    }
  });

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login');
  
  console.log('Filling form...');
  await page.fill('input[type="email"]', 'admin@oil.com');
  await page.fill('input[type="password"]', 'password123');
  
  console.log('Clicking login...');
  await page.click('button[type="submit"]');
  
  console.log('Waiting 5s...');
  await page.waitForTimeout(5000);
  
  console.log('Final URL:', page.url());
  console.log('Requests made:');
  requests.filter(url => url.startsWith('http://localhost:3000/')).forEach(url => console.log(url));
  
  await browser.close();
})();
