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
- Light / dark theme, and an **English / Russian** interface
- **Read** and **Download** straight from a card
- The catalogue is one file that loads by itself at startup
- Unsaved changes survive an accidental reload

## Getting started

```bash
git clone <this-repo> ebook-library
cd ebook-library
xdg-open index.html          # or just double-click index.html
```

1. Open `index.html` — the catalogue shipped in `ebook_app/data.js` (a two-book
   demo) appears immediately, no clicks needed.
2. In **Chrome or Edge**, press **📁 Grant folder access** and select this folder.
   From then on you can add books picked from anywhere on the disk: the app copies
   them into `books/`, covers into `thumbnails/`, and saves the catalogue itself
   after every change.
3. Without that (Firefox, Safari, or if you skip it) the app works the same way it
   always did: copy the files into `books/` and `thumbnails/` yourself, add the
   book under **Manage**, then press **Save catalogue (data.js)** and overwrite
   `ebook_app/data.js`.

Folder access has to be granted once per session — a page opened from disk cannot
keep that permission, and only Chromium browsers offer it at all.

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

Writing is the other half. No browser API may touch the disk unprompted, so there
are two modes:

| | Chrome / Edge with folder access | Everything else |
|---|---|---|
| Adding a book | pick it anywhere, the app copies it | copy it into `books/` first |
| Saving the catalogue | automatic, after every change | one click, then move the file |
| Setup | grant access once per session | nothing |

The catalogue format is identical either way, so a library filled in Chrome opens
in Firefox and back. **Load library** still reads a plain `.json`
catalogue as well as a `data.js`, so an older file can be opened by hand.

If a change is ever lost to an accidental reload, the app keeps a draft and
offers to restore it on the next start.

## Layout

```
ebook-library/
├── index.html          # open this
├── ebook_app/
│   ├── script.js       # application logic
│   ├── i18n.js         # interface translations (EN / RU)
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

- In manual mode adding a book records only the *name* of the file you select, so
  copy the file into `books/` yourself; with folder access the app does it.
- Deleting a book removes it from the catalogue only; the file stays on disk.
- The interface language follows your browser at first start and can be switched
  with the **RU / EN** button; adding a language means one more block in
  `ebook_app/i18n.js`.
- Interface preferences (theme, grid/list, language) live in `localStorage`. Book data does
  not: only a recovery draft of *unsaved* changes is kept there, and it is
  dropped as soon as you save.
- `ebook_app/data.js` is your own catalogue — it is committed here with demo
  content, so replace it (or keep it out of your commits) once you add real books.
