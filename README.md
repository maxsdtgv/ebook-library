# Electronic Library

A small, dependency-free web app for cataloguing your ebooks. It runs from a
plain folder — open `index.html` in a browser, no server, no build step, no
install. The catalogue itself is a single JSON file you keep with your books, so
it moves between computers with a copy of the folder.

![no dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)
![runs offline](https://img.shields.io/badge/runs-offline-blue)

## Features

- Book cards with covers, in **grid** or **list** view
- Search plus filters by category, author, year and file type
- Categories you can add and remove
- Classification lists (favorites, read later, work, hobby)
- Light / dark theme
- **Read** and **Download** straight from a card
- The whole catalogue saves to one `data.json`

## Getting started

```bash
git clone <this-repo> ebook-library
cd ebook-library
xdg-open index.html          # or just double-click index.html
```

1. Put your ebooks in `books/` and their cover images in `thumbnails/`.
2. Open `index.html`. The library starts **empty** and asks for a catalogue file.
3. Click **Load library** and pick your `data.json`
   (try `ebook_app/data.sample.json` for a two-book demo).
4. Add or remove books under **Manage**, then press **Save to data.json** and
   keep the file for next time.

## Why you have to load the file yourself

A page opened as `file://` is not allowed to read local files on its own — the
browser blocks it, and it cannot silently write files either. So the app never
guesses: you pick the catalogue once per session, and you save it explicitly.
That single rule is what keeps the file on disk and what you see on screen from
drifting apart.

Where the browser supports the File System Access API (Chrome, Edge) saving
overwrites your file in place; elsewhere it lands in the download folder.

## Layout

```
ebook-library/
├── index.html          # open this
├── ebook_app/
│   ├── script.js       # application logic
│   ├── styles.css      # styling
│   ├── data.json       # your catalogue
│   └── data.sample.json# two-book demo catalogue
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
- Interface preferences (theme, grid/list) live in `localStorage`; book data
  never does.
