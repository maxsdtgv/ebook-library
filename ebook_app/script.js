/*
 * Electronic Library — application logic.
 *
 * DATA MODEL (deliberately simple, after an earlier version tied itself in knots):
 *
 *   The catalogue file (ebook_app/data.js) is the ONE source of truth.
 *
 *   - It is loaded AUTOMATICALLY at startup. A page opened as file:// may not
 *     fetch() a local file — the browser blocks that — but it may load a <script>,
 *     so the catalogue is stored as JavaScript:
 *         window.LIBRARY_DATA = { ...same shape as data.json... };
 *     index.html includes it before this file, so the library is on screen with
 *     no clicks at all. If data.js is absent, the app starts empty and offers the
 *     "Load library" button (which also accepts a plain .json file).
 *   - The library lives in memory while the page is open. Changes mark it dirty
 *     and a banner asks for a save.
 *   - "Save" writes the whole catalogue back to data.js (File System Access API
 *     where available — straight over the old file — a normal download otherwise).
 *     Writing cannot happen without a user action: no browser API may touch the
 *     disk on its own. That single click is the only manual step left.
 *   - "Export JSON" additionally offers a plain data.json for backups.
 *   - localStorage holds ONLY interface preferences (theme, grid/list). Book data
 *     is never cached there — that is what used to make the file and the browser
 *     disagree about the contents of the library.
 *
 * Book files themselves are never copied by the app: ebooks live in books/ and
 * covers in thumbnails/, and a book record only stores a relative path such as
 * "books/foo.pdf". That is why those folders must sit next to index.html.
 */

'use strict';

const DEFAULT_CATEGORIES = ['Fiction', 'Non-Fiction', 'Technical'];
const PREF_THEME = 'ebooklib.theme';
const PREF_VIEW_MODE = 'ebooklib.viewMode';
const DRAFT_KEY = 'ebooklib.draft';

/* The four classification lists a book can be tagged with, straight from a card.
   `active` / `grid` / `inline` are the class names styles.css already defines for
   the two view modes. */
const CLASSIFICATIONS = [
    { key: 'favorites',  icon: '⭐', title: 'Favorite',   active: 'favorited',         grid: 'favorite-btn-grid',   inline: 'favorite-btn-inline' },
    { key: 'readLater',  icon: '📚', title: 'Read later', active: 'read-later-active', grid: 'read-later-btn-grid', inline: 'read-later-btn-inline' },
    { key: 'workBooks',  icon: '💼', title: 'Work',       active: 'work-active',       grid: 'work-btn-grid',       inline: 'work-btn-inline' },
    { key: 'hobbyBooks', icon: '🎯', title: 'Hobby',      active: 'hobby-active',      grid: 'hobby-btn-grid',      inline: 'hobby-btn-inline' }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Escape text before putting it into innerHTML (titles may contain quotes/<>).
function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fileExtension(name) {
    const dot = String(name || '').lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

// ---------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------

window.library = {
    books: [],
    categories: [...DEFAULT_CATEGORIES],
    favorites: [],
    readLater: [],
    workBooks: [],
    hobbyBooks: [],

    viewMode: localStorage.getItem(PREF_VIEW_MODE) || 'grid',
    theme: localStorage.getItem(PREF_THEME) || 'light',

    loaded: false,     // has a library file been loaded in this session?
    dirty: false,      // are there unsaved changes?

    // --- startup ----------------------------------------------------------

    init() {
        this.applyTheme();
        this.setViewMode(this.viewMode, { silent: true });
        this.showUserView();

        // Auto-load the catalogue that index.html pulled in as a <script>.
        const auto = window.LIBRARY_DATA;
        if (auto && Array.isArray(auto.books)) {
            this.applyData(auto);
            this.loaded = true;
            this.dirty = false;
            console.log('Catalogue auto-loaded from data.js:', this.books.length, 'books');
        }

        this.renderAll();

        // Safety net: if the page was closed or reloaded with unsaved changes,
        // offer to bring them back. This is an EXPLICIT recovery, never a silent
        // cache — the catalogue file stays the source of truth.
        const draft = this.readDraft();
        if (draft) {
            this.showLoadBar(`Unsaved changes from ${draft.savedAt} were found.`, false, 'draft');
        } else if (this.loaded) {
            this.showLoadBar(`Catalogue loaded automatically — ${this.books.length} book(s).`, true);
        } else {
            this.showLoadBar('No catalogue found (ebook_app/data.js) — you can load a file manually:');
        }
    },

    /* Copy a catalogue object into the live library. */
    applyData(data) {
        this.books = data.books || [];
        this.categories = Array.isArray(data.categories) && data.categories.length
            ? data.categories : [...DEFAULT_CATEGORIES];
        this.favorites = data.favorites || [];
        this.readLater = data.readLater || [];
        this.workBooks = data.workBooks || [];
        this.hobbyBooks = data.hobbyBooks || [];

        // Settings in the file are a starting point; an explicit choice the user
        // made earlier (stored as a preference) wins.
        if (data.settings?.viewMode && !localStorage.getItem(PREF_VIEW_MODE)) {
            this.setViewMode(data.settings.viewMode, { silent: true });
        }
        if (data.settings?.theme && !localStorage.getItem(PREF_THEME)) {
            this.theme = data.settings.theme;
            this.applyTheme();
        }
    },

    // --- unsaved-changes draft -------------------------------------------

    readDraft() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return null;
            const draft = JSON.parse(raw);
            return draft && draft.data ? draft : null;
        } catch (error) {
            console.warn('Ignoring unreadable draft:', error);
            localStorage.removeItem(DRAFT_KEY);
            return null;
        }
    },

    writeDraft() {
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({
                savedAt: new Date().toLocaleString(),
                data: this.snapshot()
            }));
        } catch (error) {
            console.warn('Could not store the draft (quota?):', error);
        }
    },

    clearDraft() { localStorage.removeItem(DRAFT_KEY); },

    restoreDraft() {
        const draft = this.readDraft();
        if (!draft) return;

        const data = draft.data;
        this.books = data.books || [];
        this.categories = data.categories?.length ? data.categories : [...DEFAULT_CATEGORIES];
        this.favorites = data.favorites || [];
        this.readLater = data.readLater || [];
        this.workBooks = data.workBooks || [];
        this.hobbyBooks = data.hobbyBooks || [];

        this.loaded = true;
        this.renderAll();
        this.markDirty();          // still unsaved: keep nagging until saved to a file
        this.showLoadBar(`Restored ${this.books.length} book(s) from unsaved changes — save them to a file!`, true);
        console.log('Draft restored:', this.books.length, 'books');
    },

    discardDraft() {
        if (!confirm('Discard the unsaved changes for good?')) return;
        this.clearDraft();
        this.showLoadBar('No library loaded — choose your library file (data.json):');
    },

    // --- loading ----------------------------------------------------------

    /* Load a catalogue from a File the user picked. Accepts either a plain .json
       file or a data.js wrapper (window.LIBRARY_DATA = {...};). */
    async loadFromFile(file) {
        if (!file) {
            alert('Choose a catalogue file (data.js or data.json) first.');
            return false;
        }

        let text = await file.text();

        // Unwrap "window.LIBRARY_DATA = { ... };" if that is what we were given.
        const wrapper = text.match(/LIBRARY_DATA\s*=\s*([\s\S]*?);?\s*$/);
        if (wrapper) text = wrapper[1];

        let data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            console.error('Cannot parse catalogue:', error);
            alert('That file is not a readable catalogue (expected JSON, or a data.js wrapper).');
            return false;
        }

        if (typeof data !== 'object' || data === null || !Array.isArray(data.books)) {
            alert('That file does not look like a catalogue (no "books" array).');
            return false;
        }

        this.applyData(data);
        this.loaded = true;
        this.dirty = false;
        this.clearDraft();          // the freshly loaded file wins
        this.renderAll();
        this.hideSaveWarning();
        this.showLoadBar(`Loaded "${file.name}" — ${this.books.length} book(s).`, true);
        console.log('Catalogue loaded:', this.books.length, 'books from', file.name);
        return true;
    },

    // --- saving -----------------------------------------------------------

    snapshot() {
        return {
            books: this.books,
            categories: this.categories,
            favorites: this.favorites,
            readLater: this.readLater,
            workBooks: this.workBooks,
            hobbyBooks: this.hobbyBooks,
            settings: { viewMode: this.viewMode, theme: this.theme }
        };
    },

    /* Save the catalogue as ebook_app/data.js so the next page load picks it up
       automatically. The JS wrapper is what makes auto-loading possible at all on
       a file:// page (a <script> may be loaded, a fetch() may not). */
    async saveToFile() {
        const json = JSON.stringify(this.snapshot(), null, 2);
        const contents =
            '// Electronic Library catalogue. Loaded automatically by index.html.\n' +
            '// Generated by the app — edit through the UI and press Save.\n' +
            'window.LIBRARY_DATA = ' + json + ';\n';

        // Preferred path: let the user overwrite the real file in place.
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'data.js',
                    types: [{ description: 'Library catalogue', accept: { 'text/javascript': ['.js'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(contents);
                await writable.close();
                this.dirty = false;
                this.clearDraft();          // the file is authoritative again
                this.hideSaveWarning();
                this.showLoadBar(`Saved to "${handle.name}" — ${this.books.length} book(s).`, true);
                console.log('Library written via File System Access API');
                return;
            } catch (error) {
                if (error.name === 'AbortError') return;   // user cancelled
                console.warn('File System Access API failed, falling back to download:', error);
            }
        }

        // Fallback: a normal download (ends up in the browser's download folder).
        this.download('data.js', contents, 'text/javascript');
        this.dirty = false;
        this.clearDraft();
        this.hideSaveWarning();
        this.showLoadBar(`Saved — ${this.books.length} book(s) downloaded as data.js.`, true);
        alert('data.js was downloaded (check your Downloads folder).\n' +
              'Move it into the ebook_app folder, replacing the old one.');
    },

    /* Plain JSON copy, handy for backups or moving the catalogue elsewhere. */
    exportJson() {
        this.download('data.json', JSON.stringify(this.snapshot(), null, 2), 'application/json');
    },

    download(name, contents, type) {
        const url = URL.createObjectURL(new Blob([contents], { type }));
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        URL.revokeObjectURL(url);
    },

    markDirty() {
        this.dirty = true;
        this.writeDraft();          // survive an accidental reload
        const warning = document.getElementById('saveWarning');
        if (warning) warning.style.display = 'block';
    },

    dismissWarning() { this.hideSaveWarning(); },

    hideSaveWarning() {
        const warning = document.getElementById('saveWarning');
        if (warning) warning.style.display = 'none';
    },

    /* Update the header bar. `mode` is 'pick' (default) or 'draft', which swaps
       the file chooser for restore/discard buttons. */
    showLoadBar(text, loadedOk = false, mode = 'pick') {
        const bar = document.getElementById('loadBar');
        const label = document.getElementById('loadBarText');
        const pick = document.getElementById('loadBarPick');
        const draft = document.getElementById('loadBarDraft');

        if (label) label.textContent = text;
        if (bar) {
            bar.classList.toggle('loaded', loadedOk);
            bar.classList.toggle('draft', mode === 'draft');
        }
        if (pick) pick.style.display = mode === 'draft' ? 'none' : '';
        if (draft) draft.style.display = mode === 'draft' ? '' : 'none';
    },

    // --- rendering --------------------------------------------------------

    renderAll() {
        this.renderBooks();
        this.updateFilters();
        this.renderCategories();
        this.renderAdminBooks();
    },

    /* Books currently passing the filters. */
    visibleBooks() {
        const term = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
        const category = document.getElementById('categoryFilter')?.value || '';
        const author = document.getElementById('authorFilter')?.value || '';
        const year = document.getElementById('yearFilter')?.value || '';
        const type = document.getElementById('fileTypeFilter')?.value || '';
        const classification = document.getElementById('classificationFilter')?.value || '';

        const inClass = (book) => !classification || this.hasTag(classification, book.id);

        return this.books.filter(book =>
            (!term || `${book.title} ${book.author} ${book.description || ''}`.toLowerCase().includes(term)) &&
            (!category || book.category === category) &&
            (!author || book.author === author) &&
            (!year || String(book.year) === year) &&
            (!type || fileExtension(book.fileName) === type) &&
            inClass(book)
        );
    },

    renderBooks() {
        const container = document.getElementById('booksContainer');
        if (!container) return;

        if (!this.loaded) {
            container.innerHTML = '<p class="placeholder">No library loaded. Use <strong>Load library</strong> above to open your data.json.</p>';
            return;
        }

        const books = this.visibleBooks();
        if (books.length === 0) {
            container.innerHTML = this.books.length === 0
                ? '<p class="placeholder">The library is empty. Add books in the Manage section.</p>'
                : '<p class="placeholder">No books match the current filters.</p>';
            return;
        }

        const cover = (book, w, h) => book.thumbnail
            ? `<img src="${esc(book.thumbnail)}" alt="${esc(book.title)}" class="book-thumbnail"
                    style="width:${w}px;height:${h}px;object-fit:cover;"
                    onerror="this.style.display='none'">`
            : '';

        // Clickable tag buttons (favorites / read later / work / hobby).
        const tags = (book, variant) => {
            const container = variant === 'grid' ? 'classification-buttons-grid' : 'classification-buttons';
            return `<div class="${container}">` + CLASSIFICATIONS.map(c => {
                const on = this.hasTag(c.key, book.id);
                return `<button type="button" class="${c[variant]}${on ? ' ' + c.active : ''}"
                        title="${c.title}${on ? ' (on)' : ''}"
                        onclick="window.library.toggleTag('${c.key}', '${esc(book.id)}')">${c.icon}</button>`;
            }).join('') + '</div>';
        };

        if (this.viewMode === 'list') {
            container.innerHTML = books.map(book => `
                <div class="book-card book-list-item" data-book-id="${esc(book.id)}">
                    <div class="book-thumbnail-col">${cover(book, 60, 80)}</div>
                    <div class="book-actions-col">
                        <button onclick="window.library.downloadBook('${esc(book.filePath)}')">Download</button>
                        <button onclick="window.library.readBook('${esc(book.filePath)}')">Read</button>
                        ${tags(book, 'inline')}
                    </div>
                    <div class="book-info-col">
                        <div class="book-name">${esc(book.title)}</div>
                        <div class="book-author-year">${esc(book.author)}${book.year ? ` (${esc(book.year)})` : ''}</div>
                    </div>
                    <div class="book-file-col">${esc(book.fileName)}</div>
                </div>`).join('');
        } else {
            container.innerHTML = books.map(book => `
                <div class="book-card" data-book-id="${esc(book.id)}">
                    ${cover(book, 120, 160)}
                    <h3>${esc(book.title)}</h3>
                    <p><strong>Author:</strong> ${esc(book.author)}</p>
                    <p><strong>Category:</strong> ${esc(book.category)}</p>
                    ${book.year ? `<p><strong>Year:</strong> ${esc(book.year)}</p>` : ''}
                    ${book.description ? `<p>${esc(book.description)}</p>` : ''}
                    <p><strong>File:</strong> ${esc(book.fileName)}</p>
                    ${tags(book, 'grid')}
                    <div class="book-actions">
                        <button onclick="window.library.downloadBook('${esc(book.filePath)}')">Download</button>
                        <button onclick="window.library.readBook('${esc(book.filePath)}')">Read</button>
                    </div>
                </div>`).join('');
        }
    },

    // --- classification tags ---------------------------------------------

    hasTag(key, bookId) {
        return (this[key] || []).some(id => String(id) === String(bookId));
    },

    /* Turn a tag on or off for a book. Tags are part of the catalogue, so this
       counts as a change that needs saving. */
    toggleTag(key, bookId) {
        if (!CLASSIFICATIONS.some(c => c.key === key)) return;
        if (!Array.isArray(this[key])) this[key] = [];

        if (this.hasTag(key, bookId)) {
            this[key] = this[key].filter(id => String(id) !== String(bookId));
        } else {
            this[key].push(String(bookId));
        }

        this.renderBooks();       // repaint so the button state and any active filter follow
        this.markDirty();
    },

    /* Fill every filter dropdown from the data actually present. */
    updateFilters() {
        const fill = (id, values, keepAll) => {
            const select = document.getElementById(id);
            if (!select) return;
            const current = select.value;
            select.innerHTML = `<option value="">${keepAll}</option>` +
                values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
            if (values.includes(current)) select.value = current;   // keep selection
        };

        const uniq = (arr) => [...new Set(arr.filter(v => v !== undefined && v !== null && v !== ''))];

        fill('categoryFilter', this.categories, 'All Categories');
        fill('authorFilter', uniq(this.books.map(b => b.author)).sort(), 'All Authors');
        fill('yearFilter', uniq(this.books.map(b => b.year)).sort((a, b) => b - a), 'All Years');
        fill('fileTypeFilter', uniq(this.books.map(b => fileExtension(b.fileName))).sort(), 'All Types');
    },

    renderCategories() {
        const select = document.getElementById('bookCategory');
        if (select) {
            const current = select.value;
            select.innerHTML = '<option value="">Select Category</option>' +
                this.categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
            if (this.categories.includes(current)) select.value = current;
        }

        const list = document.getElementById('categoriesList');
        if (list) {
            list.innerHTML = this.categories.map(c => `
                <div class="category-item">
                    <span>${esc(c)}</span>
                    <button onclick="window.library.deleteCategory('${esc(c)}')">Delete</button>
                </div>`).join('');
        }
    },

    renderAdminBooks() {
        const list = document.getElementById('adminBooksList');
        if (!list) return;

        if (this.books.length === 0) {
            list.innerHTML = '<p class="placeholder">No books in the library.</p>';
            return;
        }

        list.innerHTML = this.books.map(book => `
            <div class="admin-book-item">
                ${book.thumbnail ? `<img src="${esc(book.thumbnail)}" alt="${esc(book.title)}"
                     class="book-thumbnail" style="width:60px;height:80px;object-fit:cover;float:left;margin-right:10px;"
                     onerror="this.style.display='none'">` : ''}
                <h4>${esc(book.title)}</h4>
                <p>Author: ${esc(book.author)} | Category: ${esc(book.category)}${book.year ? ` | Year: ${esc(book.year)}` : ''}</p>
                <p>File: ${esc(book.filePath)}</p>
                <button class="delete-btn" data-book-id="${esc(book.id)}">Delete</button>
            </div>`).join('');

        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteBook(e.target.dataset.bookId));
        });
    },

    // --- books ------------------------------------------------------------

    /* Read the Add Book form. Fields are read by id: the inputs have no "name"
       attributes, so FormData (used by an earlier version) returned nothing and
       every book was stored as "Untitled / Unknown / unknown.pdf". */
    addBook(event) {
        if (event) event.preventDefault();

        const value = (id) => (document.getElementById(id)?.value || '').trim();
        const pickedName = (id) => document.getElementById(id)?.files?.[0]?.name || '';

        const title = value('bookTitle');
        const author = value('bookAuthor');
        const category = value('bookCategory');
        const fileName = pickedName('bookFile');
        const thumbName = pickedName('thumbnailFile');

        if (!title || !author) { alert('Title and Author are required.'); return; }
        if (!category) { alert('Choose a category.'); return; }
        if (!fileName) { alert('Choose the ebook file (it must already be in books/).'); return; }

        this.books.push({
            id: String(Date.now()),
            title, author,
            year: value('bookYear'),
            description: value('bookDescription'),
            category,
            fileName,
            filePath: `books/${fileName}`,
            thumbnail: thumbName ? `thumbnails/${thumbName}` : '',
            dateAdded: new Date().toISOString().slice(0, 10)
        });

        document.getElementById('addBookForm')?.reset();
        this.loaded = true;              // there is something to save now
        this.renderAll();
        this.markDirty();
        console.log('Book added:', title);
    },

    deleteBook(id) {
        const book = this.books.find(b => String(b.id) === String(id));
        if (!book) return;
        if (!confirm(`Delete "${book.title}" from the library?\n(The file in books/ is not touched.)`)) return;

        this.books = this.books.filter(b => String(b.id) !== String(id));
        ['favorites', 'readLater', 'workBooks', 'hobbyBooks'].forEach(key => {
            this[key] = (this[key] || []).filter(bookId => String(bookId) !== String(id));
        });

        this.renderAll();
        this.markDirty();
        console.log('Book deleted:', book.title);
    },

    downloadBook(filePath) {
        const link = document.createElement('a');
        link.href = filePath;
        link.download = filePath.split('/').pop();
        link.click();
    },

    readBook(filePath) { window.open(filePath, '_blank'); },

    // --- categories -------------------------------------------------------

    addCategory() {
        const input = document.getElementById('newCategory');
        if (!input) return;
        const name = input.value.trim();
        if (!name) return;
        if (this.categories.includes(name)) { alert(`Category "${name}" already exists.`); return; }

        this.categories.push(name);
        input.value = '';
        this.renderCategories();
        this.updateFilters();
        this.markDirty();
    },

    deleteCategory(name) {
        const used = this.books.filter(b => b.category === name).length;
        const question = used
            ? `Delete category "${name}"?\n${used} book(s) still use it and will keep the name.`
            : `Delete category "${name}"?`;
        if (!confirm(question)) return;

        this.categories = this.categories.filter(c => c !== name);
        this.renderCategories();
        this.updateFilters();
        this.markDirty();
    },

    // --- views / preferences ---------------------------------------------

    showUserView() {
        document.getElementById('userView')?.classList.add('active');
        document.getElementById('adminView')?.classList.remove('active');
    },

    showAdminView() {
        document.getElementById('userView')?.classList.remove('active');
        document.getElementById('adminView')?.classList.add('active');
        this.renderAdminBooks();
        this.renderCategories();
    },

    setViewMode(mode, { silent = false } = {}) {
        this.viewMode = mode === 'list' ? 'list' : 'grid';
        localStorage.setItem(PREF_VIEW_MODE, this.viewMode);

        const container = document.getElementById('booksContainer');
        if (container) {
            container.classList.toggle('books-grid', this.viewMode === 'grid');
            container.classList.toggle('books-list', this.viewMode === 'list');
        }
        document.getElementById('gridBtn')?.classList.toggle('active', this.viewMode === 'grid');
        document.getElementById('listBtn')?.classList.toggle('active', this.viewMode === 'list');

        if (!silent) this.renderBooks();
    },

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem(PREF_THEME, this.theme);
        this.applyTheme();
    },

    applyTheme() {
        // The stylesheet keys its palette off [data-theme="dark"] (see styles.css).
        document.documentElement.setAttribute('data-theme', this.theme);
        const btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = this.theme === 'dark' ? '☀️' : '🌙';
    }
};

// ---------------------------------------------------------------------------
// Global handlers used by the markup
// ---------------------------------------------------------------------------

function loadLibraryFile() {
    const input = document.getElementById('libraryFileInput');
    window.library.loadFromFile(input?.files?.[0]);
}
function showUserView() { window.library.showUserView(); }
function showAdminView() { window.library.showAdminView(); }
function toggleTheme() { window.library.toggleTheme(); }
function filterBooks() { window.library.renderBooks(); }
function setViewMode(mode) { window.library.setViewMode(mode); }
function addCategory() { window.library.addCategory(); }
function restoreDraft() { window.library.restoreDraft(); }
function discardDraft() { window.library.discardDraft(); }
function exportJson() { window.library.exportJson(); }

document.addEventListener('DOMContentLoaded', () => {
    window.library.init();

    document.getElementById('addBookForm')
        ?.addEventListener('submit', (e) => window.library.addBook(e));

    // Loading straight after picking a file is what people expect.
    document.getElementById('libraryFileInput')
        ?.addEventListener('change', () => loadLibraryFile());

    // Last-chance reminder if there are unsaved changes.
    window.addEventListener('beforeunload', (e) => {
        if (window.library.dirty) { e.preventDefault(); e.returnValue = ''; }
    });
});
