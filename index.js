logger = require("./utils/logger");

(async () => {
  logger.info("Recuperando artigos do getPocket");
  const pocketArticles = await require("./pocket");

  logger.info("Recuperando artigos da O'Reilly");
  const oreillyHighlight = await require("./oreilly");
})();
