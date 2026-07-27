# Electronic Library

A small, dependency-free web app for cataloguing your ebooks. It runs from a
plain folder — open `index.html` in a browser, no server, no build step, no
install. Your catalogue **loads automatically** on every start, and the whole
library moves between computers with a copy of the folder.

![no dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)
![runs offline](https://img.shields.io/badge/runs-offline-blue)

## Features

- Book cards with covers, in **grid** or **list** view
- Search plus filters by category, author, year and file type
- Categories you can add and remove
- Classification lists (favorites, read later, work, hobby)
- Light / dark theme
- **Read** and **Download** straight from a card
- The catalogue is one file that loads by itself at startup
- Unsaved changes survive an accidental reload

## Getting started

```bash
git clone <this-repo> ebook-library
cd ebook-library
xdg-open index.html          # or just double-click index.html
```

1. Put your ebooks in `books/` and their cover images in `thumbnails/`.
2. Open `index.html` — the catalogue shipped in `ebook_app/data.js` (a two-book
   demo) appears immediately, no clicks needed.
3. Add or remove books under **Manage**.
4. Press **Save catalogue (data.js)** and overwrite `ebook_app/data.js`. It is
   loaded automatically the next time you open the app.

## How the catalogue is stored

A page opened as `file://` may **not** `fetch()` a local file — the browser
blocks it. That is why the catalogue is kept as JavaScript rather than plain
JSON:

```js
// ebook_app/data.js
window.LIBRARY_DATA = { "books": [ ... ], "categories": [ ... ] };
```

`index.html` pulls that in with a `<script>` tag, which is allowed, so the
library is on screen with no clicks at all.

Saving still needs one click: **no browser API may write to disk on its own.**
In Chrome or Edge the save dialog lets you overwrite `ebook_app/data.js` in
place; in other browsers the file lands in your download folder and you move it
yourself. `Export JSON copy` gives you a plain `data.json` for backups, and
**Load library** can read either format if you ever need to load one by hand.

If a change is ever lost to an accidental reload, the app keeps a draft and
offers to restore it on the next start.

## Layout

```
ebook-library/
├── index.html          # open this
├── ebook_app/
│   ├── script.js       # application logic
│   ├── styles.css      # styling
│   ├── data.js         # your catalogue (auto-loaded; overwritten when you save)
│   └── data.sample.json# the same demo catalogue as plain JSON
├── books/              # your ebook files
└── thumbnails/         # cover images
```

Book records store **relative paths** (`books/foo.pdf`, `thumbnails/foo.svg`),
never file contents — which is why those two folders have to stay next to
`index.html`.

## Notes

- Adding a book records the *name* of the file you select; copy the file into
  `books/` yourself, since a browser cannot do it for you.
- Deleting a book removes it from the catalogue only; the file stays on disk.
- Interface preferences (theme, grid/list) live in `localStorage`. Book data does
  not: only a recovery draft of *unsaved* changes is kept there, and it is
  dropped as soon as you save.
- `ebook_app/data.js` is your own catalogue — it is committed here with demo
  content, so replace it (or keep it out of your commits) once you add real books.
