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
- `assets/js/agent.js`: Eder's agent (chat with autocomplete, clickable skills, welcome tour)
- `assets/data/kb.json`: what the agent knows, built from the résumé (see below)
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

## Eder's agent

The site has a small agent that runs entirely in the browser, with no paid AI, API key or server:

- **Chat** in the About section. Recruiters ask things like "Does Eder know C#?" and get an answer built from the résumé: where he used the skill, for how long, an example from a job, and the projects behind it. Other questions are matched to the closest résumé passage with TF-IDF (a small retrieval step, like the "R" in RAG). When nothing matches, it says it doesn't know instead of guessing. The input suggests questions as you type.
- **Clickable skills.** Each tag in the Skills section opens what he did with it, the projects that use it (with the last GitHub update), and other public repositories in that language.
- **Persona.** The agent introduces itself as Monkey D. Luffy, King of the Pirates and Eder's agent, answers greetings, thanks and goodbyes, and replies in the language of the question (PT or EN). When a technology isn't on the résumé, it says so and adds a short, true story of how fast Eder learns, without repeating itself.
- **Welcome agent.** On the first visit a bubble offers a guided tour of his story. After that, the round button in the corner reopens it.

### Update what the agent knows

The source of the agent lives in `.agentPessoalEder/` (the résumé as `profile.json`, the agent's persona and lines, and `build_kb.py`). That folder is in `.gitignore`, so it stays on your computer and never goes to GitHub. Keep a backup of it.

1. Edit `.agentPessoalEder/profile.json`: facts, jobs, projects, certifications, skills, persona and learning stories. Each job and project lists the skill ids it proves.
2. Run `python .agentPessoalEder/build_kb.py` (Python 3, no packages needed). It rewrites `assets/data/kb.json` and the Skills section of `index.html`, and warns about any skill that no job, project or certification backs up.
3. Commit `assets/data/kb.json` and `index.html`.

The Experience section is also generated from `profile.json`. With `"hide_company_names": true` in `person`, the site and the agent show each job's sector (`sector`) instead of employer and client names; set it to `false` to show the employer names again.

Note: the browser has to download `assets/data/kb.json` and `assets/js/agent.js` to run the agent, so anyone can still read those two files. Only the source folder is private.

Repositories are read live from GitHub, so a new push shows up without rebuilding. To link a new repository to a skill, give it that skill's id as a GitHub topic (for example `angular`), or add it as a project in `.agentPessoalEder/profile.json`.

## Translations

English is the default text in the HTML. The Portuguese version of each element is in its `data-pt` attribute, so to change a translation, edit that attribute next to the English text. New elements without `data-pt` stay in English.

## Change the profile photo

Save the photo as `assets/img/profile.jpg` (square, at least 400x400) and update the `src` of the `.avatar` image in `index.html`.

## Change the banner

The image at the top of the home page and the blog is `assets/img/banner.jpg` (2400x800), with a smaller `assets/img/banner-1200.jpg` for phones. It is a light, original illustration of a cozy home office (a developer at the desk with code and an AI chat bubble on the screen). Its source is `assets/img/banner-source.svg`: edit it, export it as JPG at 2400x800 and 1200x400, and keep the left side empty, because the text sits there. On phones the scene shows below the text.

## Layout

A minimal look: light top bar, full-width banner with the name and headline, a profile column on the left (photo, role and links; on phones it folds into a "Follow" button) and sections with underlined titles. System fonts, light and dark theme. All styles are in `assets/css/style.css`.
