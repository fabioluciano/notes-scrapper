const puppeteer = require("puppeteer");
var slugify = require("slugify");

require("dotenv").config();

const GETPOCKET_USERNAME = process.env.GETPOCKET_USERNAME;
const GETPOCKET_PASSWORD = process.env.GETPOCKET_PASSWORD;

hydrateArticle = (articleBody) => {
  const article = {};

  article.id = articleBody.resolved_id;
  article.title = articleBody.resolved_title;
  article.slugified_title = slugify(articleBody.resolved_title, {
    lower: true,
    strict: true,
  });
  article.url = articleBody.resolved_url;
  if (articleBody.tags) article.tags = Object.keys(articleBody.tags);

  const positionRegularExpression = /@@.*?([0-9]+)/i;
  const orderedQuotes = articleBody.annotations.sort(function (
    firstQuote,
    secondQuote
  ) {
    const firstQuotePosition = firstQuote.patch.match(
      positionRegularExpression
    )[1];
    const secondQuotePosition = secondQuote.patch.match(
      positionRegularExpression
    )[1];
    return firstQuotePosition - secondQuotePosition;
  });

  article.quotes = orderedQuotes.map((item) => item.quote);

  logger.info(`Adicionando artigo com slug: ${article.slugified_title}`);

  return article;
};

getArticles = (async () => {
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(30000);

  await page.goto("https://getpocket.com/login", {
    waitUntil: "networkidle2",
  });

  await page.type("#field-1", GETPOCKET_USERNAME);
  await page.type("#field-2", GETPOCKET_PASSWORD);
  await page.click(".login-btn-email");
  await page.waitForNavigation();

  const articles = [];

  page.on("request", (request) => {
    const allowedDomains = ["getpocket.com", "assets.getpocket.com"];
    const allowedResourceTypes = ["image", "font", "style"];

    if (
      !allowedDomains.includes(new URL(request.url()).host) ||
      allowedResourceTypes.includes(request.resourceType())
    )
      return request.abort();

    return Promise.resolve()
      .then(() => request.continue())
      .catch((e) => {
        console.log(e);
      });
  });

  page.on("response", async (response) => {
    const response_url = new URL(response.url());
    const isAnnotationUrl =
      response_url.pathname == "/v3/get" &&
      response_url.searchParams.has("hasAnnotations");

    if (isAnnotationUrl) {
      const response_body = JSON.parse(await response.text());

      for (item in response_body.list) {
        const articleDraft = response_body.list[item];
        const article = hydrateArticle(articleDraft);
        articles.push(article);
      }
    }
  });

  await page.setRequestInterception(true);
  await page.goto("https://getpocket.com/my-list/highlights", {
    waitUntil: "networkidle0",
  });

  await browser.close();
  return articles;
})();

module.exports = getArticles;
