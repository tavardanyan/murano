import puppeteer from 'puppeteer';
import UserAgent from 'user-agents';

const SITE_URL = 'https://haysell.com/auth/login.php';

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

while (true) {
  let firstRun = true;
  let reqData = [];
  let timer = 0;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    await page.emulateTimezone('Asia/Yerevan');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-IN,en;q=0.9' });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    const userAgent = new UserAgent();
    await page.setUserAgent(userAgent.toString());
    console.log(userAgent.toString());

    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 10_000 });

    await page.waitForSelector('input[name="login"]', { timeout: 10_000 });
    await delay(1_000);
    await page.type('input[name="login"]', '+37499322411', { delay: 100 });
    await page.type('input[name="password"]', '844726Mar!', { delay: 100 });
    await delay(1_000);
    await page.click('form button.btn-primary');

    await page.waitForSelector('#container', { timeout: 10_000 });
    await delay(1_000);

    while (true) {
      if (firstRun || reqData.length > 0) {
        const fetchData = await fetch('https://script.google.com/macros/s/AKfycbwzbg3liUU71wPt6m26rVxKQOm-m3mCsyX4ELSw1GoVz4z_hr26tFHcp4zV0wV4QPMEhQ/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'MY_SECRET',
            data: reqData,
          }),
        });

        reqData = [];
        const res = await fetchData.json();
        console.log(res);
        timer = Math.floor(new Date(res.row[2]).getTime() / 1000);
      }

      await page.goto('https://prod.haysell.com/sell_history_new.php', { waitUntil: 'domcontentloaded', timeout: 10_000 });
      await page.waitForSelector('#dynamic-table', { timeout: 10_000 });
      await delay(5_000);
      await page.click('#dynamic-table > thead > tr:nth-child(1) > th:nth-child(2)');
      await delay(1_000);
      await page.click('#dynamic-table > thead > tr:nth-child(1) > th:nth-child(2)');
      await delay(1_000);

      const tableData = await page.$$eval('#dynamic-table tr', rows =>
        rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          return cells.map(cell => cell.textContent.trim());
        })
      );

      tableData.shift(); // remove header
      tableData.shift(); // remove extra header
      tableData.pop();   // remove summary row

      const data = tableData.map(row => ({
        id: +row[30],
        fiscal: row[31],
        date: new Date(row[1]),
        branch: row[0],
        product: row[4],
        sku: row[3],
        quantity: +row[6],
        price: +row[8],
        discount: +row[9].replace(' %', ''),
        total: +row[15],
        cashier: row[22],
        client: row[23],
      })).reverse();

      reqData = data.filter(item => Math.floor(new Date(item.date).getTime() / 1000) > timer);
      console.log(reqData);

      await delay(10_000);
      firstRun = false;
    }

  } catch (err) {
    console.error('Error occurred:', err.message);
    await browser.close();
    await delay(30_000);
  }
}
