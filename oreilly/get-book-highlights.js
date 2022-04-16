const puppeteer = require("puppeteer");
const csv = require("csv-parser");
const fs = require("fs");

require("dotenv").config();

const OREILLY_USERNAME = process.env.OREILLY_USERNAME;
const OREILLY_PASSWORD = process.env.OREILLY_PASSWORD;

const downloadCSV = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: "./",
  });
  await page.goto("https://go.oreilly.com/ACM", {
    waitUntil: "networkidle0",
  });

  // Faz o login
  await page.type("#username", OREILLY_USERNAME.split("@").shift());
  await page.type("#pword", OREILLY_PASSWORD);
  await page.click("input[type=submit]");
  await page.waitForNavigation();
  logger.info("Fazendo login na página da O'Reilly");

  // Vai para a página de highlights
  await page.goto("https://learning.oreilly.com/highlights/", {
    waitUntil: "networkidle0",
  });
  await page.waitForSelector("div[data-testid=csv] a");
  logger.info("Capturando a página de highlights");

  // Clica no link para download do csv
  await page.click("div[data-testid=csv] a");
  await page.waitForTimeout(8000);
  await browser.close();
};

const hydrateBookHighlight = (highlightRecord) => {
  const bookHighlight = {};
  bookHighlight.title = highlightRecord["Book Title"];
  bookHighlight.items = [];

  const highlightRow = {
    chapter: highlightRecord["Chapter Title"],
    highlight: {
      selection: highlightRecord["Highlight"],
      note: highlightRecord["Personal Note"],
    },
  };

  bookHighlight.items.push(highlightRow);
  return bookHighlight;
};

const readCSVToArray = async () => {
  const booksHighlights = [];
  await new Promise(function (resolve) {
    fs.createReadStream("oreilly-annotations.csv")
      .pipe(csv())
      .on("data", function (csvRow) {
        let bookHighlight = hydrateBookHighlight(csvRow);
        booksHighlights.push(bookHighlight);

        resolve();
      });
  });

  return booksHighlights;
};

const organizeHighlightList = (highlightList) => {
  return highlightList.filter((element, elementIndex) => {
    const bookIndex = highlightList.findIndex((e) => {
      return element.title === e.title;
    });

    if (bookIndex != elementIndex) {
      highlightList[bookIndex].items.push(element.items[0]);
      return false;
    }

    return true;
  });
};

const allBooksHighlights = (async () => {
  await downloadCSV();
  const booksHighlights = await readCSVToArray();
  const organizedBookHighlightList = organizeHighlightList(booksHighlights);

  console.dir(organizedBookHighlightList, { depth: 100 });
  return organizedBookHighlightList;
})();

module.exports = allBooksHighlights;
