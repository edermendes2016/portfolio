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
- `assets/img/`: images, favicon and the social sharing image (`og-image.png`)

## Add a blog post

1. Copy an existing file in `blog/posts/` and edit the title, date, description and text.
2. Add the Portuguese text in `data-pt` attributes, as in the existing posts.
3. Add a card for it in `blog/index.html` (and on the home page, if you want).
4. Add its URL to `sitemap.xml`.

## Translations

English is the default text in the HTML. The Portuguese version of each element is in its `data-pt` attribute, so to change a translation, edit that attribute next to the English text. New elements without `data-pt` stay in English.

## Change the profile photo

Save the photo as `assets/img/profile.jpg` (square, at least 400x400) and update the `src` of the `.avatar` image in `index.html`.
