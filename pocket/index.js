getArticles = (async () => {
  return await require("./get-article-highlights");
})();

module.exports = getArticles;
