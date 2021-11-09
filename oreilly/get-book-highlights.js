const puppeteer = require("puppeteer");
const csv = require("csv-parser");
const fs = require("fs");

require("dotenv").config();

const OREILLY_USERNAME = process.env.OREILLY_USERNAME;
const OREILLY_PASSWORD = process.env.OREILLY_PASSWORD;

hydrateBookHighlight = (highlightRecord) => {
  const bookHighlight = {};
  bookHighlight.title = highlightRecord["Book Title"];
  bookHighlight.highlights = {};
  bookHighlight.highlights.chapter = highlightRecord["Chapter Title"];
  bookHighlight.highlights.highlight = highlightRecord["Highlight"];
  bookHighlight.highlights.note = highlightRecord["Personal Note"];

  return bookHighlight;
};

getBookHighlight = (async () => {
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();

  await page.goto("https://go.oreilly.com/ACM", {
    waitUntil: "networkidle0",
  });

  await page.type("#username", OREILLY_USERNAME.split("@").shift());
  await page.type("#pword", OREILLY_PASSWORD);
  await page.click("input[type=submit]");
  await page.waitForNavigation();
  logger.info("Fazendo login na página da O'Reilly");

  await page.goto("https://learning.oreilly.com/highlights/", {
    waitUntil: "networkidle0",
  });

  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: "./",
  });

  await page.click("div[data-testid=csv] a");
  await browser.close();

  const booksHighlights = [];

  await new Promise(function (resolve) {
    fs.createReadStream("oreilly-annotations.csv")
      .pipe(csv())
      .on("data", function (csvRow) {
        let bookHighlight = hydrateBookHighlight(csvRow);
        resolve(booksHighlights.push(bookHighlight));
      });
  });

  return booksHighlights.reduce((acc, { title, highlights }) => {
    acc[title] ??= { title: title, highlights: [] };
    if (Array.isArray(highlights))
      acc[title].highlights = acc[title].highlights.concat(highlights);
    else acc[title].highlights.push(highlights);

    return acc;
  }, {});
})();

module.exports = getBookHighlight;
