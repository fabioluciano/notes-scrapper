const getArticles = require('./get-articles');
let fs = require("fs")
let {
  render
} = require("mustache")

let template = fs.readFileSync("./template.md").toString()

getArticles.then(function (articles) {
  articles.forEach(article => {
    let output = render(template, article)

    fs.writeFileSync(`./notes/${article.slugified_title}.md`, output)
  })
})