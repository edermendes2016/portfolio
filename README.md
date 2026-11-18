# Portfolio

Personal portfolio and study blog of Eder Mendes Amaral, published with GitHub Pages at https://edermendes2016.github.io/portfolio/.

The site is in English, with a button in the header to switch to Brazilian Portuguese.

Plain HTML, CSS and a little JavaScript. No build step.

## Run locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Structure

- `index.html`: home page (about, projects, experience, skills, certifications)
- `blog/`: blog index and posts (`blog/posts/*.html`)
- `assets/css/style.css`: styles, light and dark theme
- `assets/js/main.js`: theme toggle, language toggle (EN / PT-BR) and mobile menu
- `assets/js/repos.js`: the "More on GitHub" list on the home page
- `assets/js/chat.js`: the "Ask about me" chat in the About section
- `chat-api/`: the small backend (Cloudflare Worker) that answers the chat
- `assets/img/`: images, favicon and the social sharing image (`og-image.png`)

## Add a blog post

1. Copy an existing file in `blog/posts/` and edit the title, date, description and text.
2. Add the Portuguese text in `data-pt` attributes, as in the existing posts.
3. Add a card for it in `blog/index.html` (and on the home page, if you want).
4. Add its URL to `sitemap.xml`.

## Repositories list

The "More on GitHub" list under the featured project is loaded from the GitHub API when the page opens, so a new public repository shows up on its own, with no change to this site. It shows the 6 public repositories updated most recently, leaving out forks, archived repositories, this site and the featured project.

- The card text comes from the repository's **About** on GitHub: the description, and the website, which becomes a "Live site" button. Fill these in on GitHub to improve a card.
- To hide a repository, add the topic `no-portfolio` to it on GitHub, or add its name to `EXCLUDE` in `assets/js/repos.js`.
- To show more or fewer, change `LIMIT` in the same file.
- Private repositories never appear.

## "Ask about me" chat

In the About section, recruiters can ask an AI questions such as "Does Eder know C#?". It answers only from the profile in `chat-api/src/profile.md` and the public GitHub repositories, and says so when something isn't there. It needs a small backend to keep the API key secret: see [`chat-api/README.md`](chat-api/README.md) for the setup. Until the backend URL is set in `index.html`, the chat stays hidden.

## Translations

English is the default text in the HTML. The Portuguese version of each element is in its `data-pt` attribute, so to change a translation, edit that attribute next to the English text. New elements without `data-pt` stay in English.

## Change the profile photo

Save the photo as `assets/img/profile.jpg` (square, at least 400x400) and update the `src` of the `.avatar` image in `index.html`.
