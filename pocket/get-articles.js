const puppeteer = require('puppeteer');
var slugify = require('slugify')
require('dotenv').config();

const GETPOCKET_USERNAME = process.env.GETPOCKET_USERNAME;
const GETPOCKET_PASSWORD = process.env.GETPOCKET_PASSWORD;

getArticles = (async () => {
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(30000);

  await page.goto('https://getpocket.com/login', {
    networkIdleTimeout: 5000,
    waitUntil: 'networkidle',
  });

  await page.waitForSelector('#field-1')
  await page.type('#field-1', GETPOCKET_USERNAME)
  await page.waitForSelector('#field-2')
  await page.type('#field-2', GETPOCKET_PASSWORD)
  await page.waitForSelector('.login-btn-email')
  await page.click('.login-btn-email')
  await page.waitForNavigation()

  await page.setRequestInterception(true);
  articles = []

  page.on('request', (request) => {
    if (!['getpocket.com', 'assets.getpocket.com'].includes(new URL(request.url()).host)) return request.abort()
    if (['image', 'font', 'style'].includes(request.resourceType())) return request.abort()
    return Promise.resolve().then(() => request.continue()).catch(e => {});
  })

  page.on('response', async (response) => {
    const response_url = new URL(response.url())
    if (response_url.pathname == '/v3/get' && response_url.searchParams.has('hasAnnotations')) {
      const response_body = JSON.parse(await response.text());

      for (item in response_body.list) {
        const articleDraft = response_body.list[item]
        let article = {}
        article.id = articleDraft.resolved_id
        article.title = articleDraft.resolved_title
        article.slugified_title = slugify(articleDraft.resolved_title, {
          lower: true,
          strict: true
        })
        article.url = articleDraft.resolved_url
        if (articleDraft.tags) article.tags = Object.keys(articleDraft.tags)

        const positionRegularExpression = /@@.*?([0-9]+)/i
        const orderedQuotes = articleDraft.annotations.sort(function (firstQuote, secondQuote) {
          let firstQuotePosition = firstQuote.patch.match(positionRegularExpression)[1]
          let secondQuotePosition = secondQuote.patch.match(positionRegularExpression)[1]
          return firstQuotePosition - secondQuotePosition
        });

        article.quotes = orderedQuotes.map(item => item.quote)

        articles.push(article)
      }
    }
  })

  await page.goto('https://getpocket.com/my-list/highlights', {
    'waitUntil': 'networkidle0'
  })

  await browser.close();
  return articles
})();

module.exports = getArticles
