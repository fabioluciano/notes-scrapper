const getArticles = require('./get-articles');
let fs = require("path")
let {
  render
} = require("mustache")

const templatePath = path.join(__dirname, './template.md');
const template = fs.readFileSync(templatePath).toString()

getArticles.then(function (articles) {
  articles.forEach(article => {
    let output = render(template, article)

    fs.writeFileSync(`./notes/${article.slugified_title}.md`, output)
  })
})