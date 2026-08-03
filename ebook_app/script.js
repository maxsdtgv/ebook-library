/*
 * Electronic Library — application logic.
 *
 * DATA MODEL (deliberately simple, after an earlier version tied itself in knots):
 *
 *   The catalogue file (data.js, next to index.html) is the ONE source of truth.
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
 *   - "Save" opens an ordinary save dialog for data.js (a browser may not write
 *     to disk unprompted). In Chrome/Edge the dialog remembers its directory, so
 *     after the first save it points straight at the library folder and offers
 *     to replace the old file. Elsewhere the file is downloaded — move it next
 *     to index.html by hand.
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

    loaded: false,     // has a catalogue been loaded in this session?
    dirty: false,      // are there unsaved changes?

    // --- startup ----------------------------------------------------------

    init() {
        setLang(getLang());          // paint the markup in the remembered language
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

        // The header stays quiet when everything is normal. A banner appears
        // only when something needs the user: no catalogue at all, or unsaved
        // changes from a previous session (an EXPLICIT recovery, never a silent
        // cache — the catalogue file stays the source of truth).
        const draft = this.readDraft();
        if (draft) {
            this.showLoadBar(t('bar.draftFound', { when: draft.savedAt }), false, 'draft');
        } else if (!this.loaded) {
            this.showLoadBar(t('bar.noCatalogue'), false);
        } else {
            this.hideLoadBar();
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

    /* Record a change: keep the recovery draft and ask the user to save. */
    persist() {
        this.markDirty();
    },

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
        this.hideLoadBar();
        console.log('Draft restored:', this.books.length, 'books');
    },

    discardDraft() {
        if (!confirm(t('msg.dropDraft'))) return;
        this.clearDraft();
        if (this.loaded) {
            this.hideLoadBar();
        } else {
            this.showLoadBar(t('bar.noCatalogue'), false);
        }
    },

    // --- loading ----------------------------------------------------------

    /* Load a catalogue from a File the user picked. Accepts either a plain .json
       file or a data.js wrapper (window.LIBRARY_DATA = {...};). */
    async loadFromFile(file) {
        if (!file) {
            alert(t('msg.pickFile'));
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
            alert(t('msg.badJson'));
            return false;
        }

        if (typeof data !== 'object' || data === null || !Array.isArray(data.books)) {
            alert(t('msg.notCatalogue'));
            return false;
        }

        this.applyData(data);
        this.loaded = true;
        this.dirty = false;
        this.clearDraft();          // the freshly loaded file wins
        this.renderAll();
        this.hideSaveWarning();
        this.hideLoadBar();
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

    /* The exact text of data.js — kept in one place so the saved file and the
       downloaded fallback can never drift apart. */
    catalogueSource() {
        return '// Electronic Library catalogue. Loaded automatically by index.html.\n' +
               '// Generated by the app — edit through the UI and press Save.\n' +
               'window.LIBRARY_DATA = ' + JSON.stringify(this.snapshot(), null, 2) + ';\n';
    },

    /* Save the catalogue as data.js (next to index.html) so the next page load
       picks it up automatically. Always through an explicit dialog:
       - Chrome/Edge: a save dialog that remembers its directory (`id`), so after
         the first save it opens right in the library folder and offers to
         replace the old data.js.
       - Firefox/Safari: no such API — the file is downloaded instead. */
    async saveToFile() {
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    id: 'ebooklib-datajs',
                    suggestedName: 'data.js',
                    types: [{ description: 'Library catalogue', accept: { 'text/javascript': ['.js'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(this.catalogueSource());
                await writable.close();
                this.dirty = false;
                this.clearDraft();          // the file is authoritative again
                this.hideSaveWarning();
                this.hideLoadBar();
                console.log('Catalogue written via the save dialog:', handle.name);
                return;
            } catch (error) {
                if (error.name === 'AbortError') return;   // user cancelled
                console.warn('Save dialog failed, falling back to download:', error);
            }
        }

        // No File System Access API (Firefox, Safari): a normal download.
        this.download('data.js', this.catalogueSource(), 'text/javascript');
        this.dirty = false;
        this.clearDraft();
        this.hideSaveWarning();
        this.hideLoadBar();
        alert(t('msg.downloaded'));
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

        // Once you change something, the recovery offer is stale: this very draft
        // has just replaced the old one, and the "unsaved changes" banner below
        // now carries that message.
        const bar = document.getElementById('loadBar');
        if (bar?.classList.contains('draft')) {
            if (this.loaded) {
                this.hideLoadBar();
            } else {
                this.showLoadBar(t('bar.noCatalogue'), false);
            }
        }
        const warning = document.getElementById('saveWarning');
        if (warning) warning.style.display = 'block';
    },

    dismissWarning() { this.hideSaveWarning(); },

    hideSaveWarning() {
        const warning = document.getElementById('saveWarning');
        if (warning) warning.style.display = 'none';
    },

    /* Update the header bar. `mode` is 'pick' (default) or 'draft', which swaps
       the file chooser for restore/discard buttons. Normally the bar is hidden
       entirely — it appears only when the user has to act. */
    showLoadBar(text, loadedOk = false, mode = 'pick') {
        const bar = document.getElementById('loadBar');
        const label = document.getElementById('loadBarText');
        const pick = document.getElementById('loadBarPick');
        const draft = document.getElementById('loadBarDraft');

        if (label) label.textContent = text;
        if (bar) {
            bar.style.display = '';
            bar.classList.toggle('loaded', loadedOk);
            bar.classList.toggle('draft', mode === 'draft');
        }
        if (pick) pick.style.display = mode === 'draft' ? 'none' : '';
        if (draft) draft.style.display = mode === 'draft' ? '' : 'none';
    },

    hideLoadBar() {
        const bar = document.getElementById('loadBar');
        if (bar) bar.style.display = 'none';
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
            container.innerHTML = `<p class="placeholder">${t('empty.noCatalogue')}</p>`;
            return;
        }

        const books = this.visibleBooks();
        if (books.length === 0) {
            container.innerHTML = `<p class="placeholder">${
                this.books.length === 0 ? t('empty.library') : t('empty.noMatches')}</p>`;
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
                        title="${t('tag.' + c.key)}${on ? t('tag.on') : ''}"
                        onclick="window.library.toggleTag('${c.key}', '${esc(book.id)}')">${c.icon}</button>`;
            }).join('') + '</div>';
        };

        if (this.viewMode === 'list') {
            container.innerHTML = books.map(book => `
                <div class="book-card book-list-item" data-book-id="${esc(book.id)}">
                    <div class="book-thumbnail-col">${cover(book, 60, 80)}</div>
                    <div class="book-actions-col">
                        <button onclick="window.library.downloadBook('${esc(book.filePath)}')">${t('card.download')}</button>
                        <button onclick="window.library.readBook('${esc(book.filePath)}', '${esc(book.title)}')">${t('card.read')}</button>
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
                    <p><strong>${t('card.author')}</strong> ${esc(book.author)}</p>
                    <p><strong>${t('card.category')}</strong> ${esc(book.category)}</p>
                    ${book.year ? `<p><strong>${t('card.year')}</strong> ${esc(book.year)}</p>` : ''}
                    ${book.description ? `<p>${esc(book.description)}</p>` : ''}
                    <p><strong>${t('card.file')}</strong> ${esc(book.fileName)}</p>
                    ${tags(book, 'grid')}
                    <div class="book-actions">
                        <button onclick="window.library.downloadBook('${esc(book.filePath)}')">${t('card.download')}</button>
                        <button onclick="window.library.readBook('${esc(book.filePath)}', '${esc(book.title)}')">${t('card.read')}</button>
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
        this.persist();
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

        fill('categoryFilter', this.categories, t('filter.allCategories'));
        fill('authorFilter', uniq(this.books.map(b => b.author)).sort(), t('filter.allAuthors'));
        fill('yearFilter', uniq(this.books.map(b => b.year)).sort((a, b) => b - a), t('filter.allYears'));
        fill('fileTypeFilter', uniq(this.books.map(b => fileExtension(b.fileName))).sort(), t('filter.allTypes'));
    },

    renderCategories() {
        const select = document.getElementById('bookCategory');
        if (select) {
            const current = select.value;
            select.innerHTML = `<option value="">${t('form.selectCategory')}</option>` +
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
            list.innerHTML = `<p class="placeholder">${t('empty.adminBooks')}</p>`;
            return;
        }

        list.innerHTML = this.books.map(book => `
            <div class="admin-book-item">
                <div class="admin-book-cover">
                    ${book.thumbnail ? `<img src="${esc(book.thumbnail)}" alt="${esc(book.title)}"
                         class="book-thumbnail" onerror="this.style.display='none'">` : ''}
                </div>
                <div class="admin-book-info">
                <h4>${esc(book.title)}</h4>
                <p>${t('admin.meta', { author: esc(book.author), category: esc(book.category) })
                     }${book.year ? t('admin.metaYear', { year: esc(book.year) }) : ''}</p>
                <p>${t('admin.file', { path: esc(book.filePath) })}</p>
                </div>
                <div class="admin-book-actions">
                    <button class="edit-btn" data-book-id="${esc(book.id)}">${t('manage.edit')}</button>
                    <button class="delete-btn" data-book-id="${esc(book.id)}">${t('manage.delete')}</button>
                </div>
            </div>`).join('');

        list.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.editBook(e.target.dataset.bookId));
        });
        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteBook(e.target.dataset.bookId));
        });
    },

    // --- books ------------------------------------------------------------

    /* Id of the book currently being edited in the Add Book form, or null when
       the form adds a new one. */
    editingId: null,

    /* Read the Add Book form. Fields are read by id: the inputs have no "name"
       attributes, so FormData (used by an earlier version) returned nothing and
       every book was stored as "Untitled / Unknown / unknown.pdf".
       The same form both adds and edits: see editBook(). */
    async addBook(event) {
        if (event) event.preventDefault();

        const value = (id) => (document.getElementById(id)?.value || '').trim();
        const picked = (id) => document.getElementById(id)?.files?.[0] || null;

        const title = value('bookTitle');
        const author = value('bookAuthor');
        const category = value('bookCategory');
        const bookFile = picked('bookFile');
        const thumbFile = picked('thumbnailFile');

        const editing = this.editingId
            ? this.books.find(b => String(b.id) === String(this.editingId))
            : null;

        if (!title || !author) { alert(t('msg.needTitleAuthor')); return; }
        if (!category) { alert(t('msg.needCategory')); return; }
        if (!bookFile && !editing) { alert(t('msg.needBookFile')); return; }

        // Only the file NAME is recorded: the app cannot copy files around, so
        // the ebook must already sit in books/ (and its cover in thumbnails/).

        if (editing) {
            Object.assign(editing, {
                title, author, category,
                year: value('bookYear'),
                description: value('bookDescription')
            });
            // Files are replaced only if a new one was actually picked.
            if (bookFile) {
                editing.fileName = bookFile.name;
                editing.filePath = `books/${bookFile.name}`;
            }
            if (thumbFile) editing.thumbnail = `thumbnails/${thumbFile.name}`;
            console.log('Book updated:', title);
        } else {
            this.books.push({
                id: String(Date.now()),
                title, author,
                year: value('bookYear'),
                description: value('bookDescription'),
                category,
                fileName: bookFile.name,
                filePath: `books/${bookFile.name}`,
                thumbnail: thumbFile ? `thumbnails/${thumbFile.name}` : '',
                dateAdded: new Date().toISOString().slice(0, 10)
            });
            console.log('Book added:', title);
        }

        this.stopEditing();              // also resets the form
        this.loaded = true;              // there is something to save now
        this.renderAll();
        await this.persist();
    },

    /* Put a book into the Add Book form and switch it to editing mode. */
    editBook(id) {
        const book = this.books.find(b => String(b.id) === String(id));
        if (!book) return;

        this.editingId = String(id);

        const set = (fid, v) => {
            const el = document.getElementById(fid);
            if (el) el.value = v ?? '';
        };
        set('bookTitle', book.title);
        set('bookAuthor', book.author);
        set('bookYear', book.year);
        set('bookDescription', book.description);
        set('bookCategory', book.category);

        // In editing mode the file is optional — empty means "keep the old one".
        document.getElementById('bookFile')?.removeAttribute('required');

        this.refreshEditUi();
        document.getElementById('addBookForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    cancelEdit() {
        this.stopEditing();
    },

    /* Leave editing mode and put the form back into its "add" state. */
    stopEditing() {
        this.editingId = null;
        document.getElementById('addBookForm')?.reset();
        document.getElementById('bookFile')?.setAttribute('required', '');
        this.refreshEditUi();
    },

    /* Submit button text, cancel button and the "editing…" hint all follow
       editingId. Called on enter/leave and after a language switch. */
    refreshEditUi() {
        const editing = this.editingId
            ? this.books.find(b => String(b.id) === String(this.editingId))
            : null;

        const submit = document.getElementById('bookSubmitBtn');
        if (submit) submit.textContent = editing ? t('form.submitEdit') : t('form.submit');

        const cancel = document.getElementById('cancelEditBtn');
        if (cancel) cancel.style.display = editing ? '' : 'none';

        const hint = document.getElementById('editingHint');
        if (hint) {
            hint.style.display = editing ? '' : 'none';
            hint.textContent = editing
                ? t('manage.editingHint', { title: editing.title, file: editing.filePath })
                : '';
        }
    },

    deleteBook(id) {
        const book = this.books.find(b => String(b.id) === String(id));
        if (!book) return;
        if (!confirm(t('msg.deleteBook', { title: book.title }))) return;

        if (String(id) === String(this.editingId)) this.stopEditing();

        this.books = this.books.filter(b => String(b.id) !== String(id));
        ['favorites', 'readLater', 'workBooks', 'hobbyBooks'].forEach(key => {
            this[key] = (this[key] || []).filter(bookId => String(bookId) !== String(id));
        });

        this.renderAll();
        this.persist();
        console.log('Book deleted:', book.title);
    },

    /* Force a real download, never a preview. On http(s) the file is fetched
       into a blob first — a blob link always downloads. A file:// page cannot
       fetch local files, so there the download attribute has to do the job. */
    async downloadBook(filePath) {
        const name = filePath.split('/').pop();
        if (location.protocol !== 'file:') {
            try {
                const response = await fetch(filePath);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const url = URL.createObjectURL(await response.blob());
                const link = document.createElement('a');
                link.href = url;
                link.download = name;
                link.click();
                URL.revokeObjectURL(url);
                return;
            } catch (error) {
                console.warn('Blob download failed, using a plain link:', error);
            }
        }
        const link = document.createElement('a');
        link.href = filePath;
        link.download = name;
        link.click();
    },

    // --- built-in reader ---------------------------------------------------

    /* Formats a browser can render by itself — these open in the overlay. */
    VIEWABLE_TYPES: ['pdf', 'txt', 'html', 'htm', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],

    /* Open the book in the in-app viewer. The browser renders pdf/txt/images
       itself; djvu goes through the bundled DjVu.js viewer; anything else
       (epub, doc…) gets a message with a download button instead. */
    readBook(filePath, title) {
        const overlay = document.getElementById('readerOverlay');
        const body = document.getElementById('readerBody');
        const heading = document.getElementById('readerTitle');
        if (!overlay || !body) return;

        const ext = fileExtension(filePath);
        if (heading) heading.textContent = title || filePath.split('/').pop();

        if (this.VIEWABLE_TYPES.includes(ext)) {
            body.innerHTML = `<iframe class="reader-frame" src="${esc(filePath)}" title="${esc(title || '')}"></iframe>`;
        } else if (ext === 'djvu') {
            body.innerHTML = '<div id="djvuContainer" class="reader-djvu"></div>';
            this.openDjvu(filePath, title);            // async; shows fallback on failure
        } else {
            body.innerHTML = this.readerFallbackHtml(filePath, ext);
        }
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';   // page behind must not scroll
    },

    /* The "browser cannot show this" message with download / new tab buttons. */
    readerFallbackHtml(filePath, ext) {
        return `
            <div class="reader-unsupported">
                <p>${t('viewer.cantPreview', { ext: esc(ext || '?') })}</p>
                <button onclick="window.library.downloadBook('${esc(filePath)}')">${t('card.download')}</button>
                <button onclick="window.open('${esc(filePath)}', '_blank')">${t('viewer.openTab')}</button>
            </div>`;
    },

    // --- DjVu support (bundled DjVu.js, https://djvu.js.org) ----------------
    /*
     * The two vendor scripts total ~1 MB, so they are loaded lazily, the first
     * time a .djvu book is opened. NOTE: DjVu.js needs a Web Worker and fetches
     * the file over XHR — both are blocked on a file:// page, so inline DjVu
     * reading works when the library is served over http(s) (any static server
     * does, e.g. `python3 -m http.server`). On file:// the viewer fails fast
     * and the message with a download button appears instead.
     */
    djvuViewer: null,

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    },

    async ensureDjvuViewer() {
        if (window.DjVu?.Viewer) return;
        await this.loadScript('ebook_app/vendor/djvu.js');
        await this.loadScript('ebook_app/vendor/djvu_viewer.js');
    },

    async openDjvu(filePath, title) {
        const container = document.getElementById('djvuContainer');
        if (!container) return;
        const name = title || filePath.split('/').pop();
        try {
            await this.ensureDjvuViewer();

            // Fetch the file ourselves and hand the viewer the bytes, not the
            // path: new URL() percent-encodes Cyrillic and spaces in file names
            // properly, and any load problem surfaces here as a catchable error
            // instead of the viewer's own "network error" screen.
            const url = new URL(filePath, location.href).href;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
            const buffer = await response.arrayBuffer();

            this.djvuViewer = new DjVu.Viewer();
            this.djvuViewer.render(container);
            this.djvuViewer.loadDocument(buffer, name, {
                name,
                language: getLang(),
                theme: this.theme,
                uiOptions: {
                    hideFullPageSwitch: true,       // the overlay is the full page
                    hideOpenAndCloseButtons: true,  // the catalogue picks the book
                    hidePrintButton: true
                }
            });
        } catch (error) {
            console.error('DjVu viewer failed (file:// page? see the comment above):', error);
            this.djvuViewer = null;
            const body = document.getElementById('readerBody');
            if (body) body.innerHTML = this.readerFallbackHtml(filePath, 'djvu');
        }
    },

    closeReader() {
        const overlay = document.getElementById('readerOverlay');
        const body = document.getElementById('readerBody');
        if (overlay) overlay.style.display = 'none';
        if (body) body.innerHTML = '';             // stop the PDF plugin etc.
        this.djvuViewer = null;                    // let the DjVu worker be collected
        document.body.style.overflow = '';
    },

    // --- categories -------------------------------------------------------

    addCategory() {
        const input = document.getElementById('newCategory');
        if (!input) return;
        const name = input.value.trim();
        if (!name) return;
        if (this.categories.includes(name)) { alert(t('msg.categoryExists', { name })); return; }

        this.categories.push(name);
        input.value = '';
        this.renderCategories();
        this.updateFilters();
        this.persist();
    },

    deleteCategory(name) {
        const used = this.books.filter(b => b.category === name).length;
        const question = used
            ? t('msg.deleteCategoryUsed', { name, count: used })
            : t('msg.deleteCategory', { name });
        if (!confirm(question)) return;

        this.categories = this.categories.filter(c => c !== name);
        this.renderCategories();
        this.updateFilters();
        this.persist();
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

    /* Switch RU/EN: static markup is refreshed by the i18n module, everything the
       app draws itself is repainted here. */
    setLanguage(lang) {
        setLang(lang);
        if (!this.loaded) this.showLoadBar(t('bar.noCatalogue'), false);
        this.renderAll();
        this.refreshEditUi();   // static translation would reset the Save/Add button text
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
function toggleLang() { window.library.setLanguage(getLang() === 'ru' ? 'en' : 'ru'); }

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

    // Escape closes the reader overlay.
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.library.closeReader();
    });
});
