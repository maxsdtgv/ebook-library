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

    loaded: false,     // has a catalogue been loaded in this session?
    dirty: false,      // are there unsaved changes?
    sourceLabel: '',   // what the header says about where the catalogue came from

    // --- startup ----------------------------------------------------------

    init() {
        setLang(getLang());          // paint the markup in the remembered language
        this.applyTheme();
        this.setViewMode(this.viewMode, { silent: true });
        this.showUserView();
        this.updateFolderUi();

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
        this.sourceLabel = this.loaded
            ? t('bar.autoLoaded', { count: this.books.length })
            : t('bar.noCatalogue');

        const draft = this.readDraft();
        if (draft) {
            // The saved catalogue is what you see; the draft is an older set of
            // changes that was never written to a file. Say which is which.
            this.showLoadBar(t('bar.draftFound', { when: draft.savedAt }), false, 'draft');
        } else {
            this.showLoadBar(this.sourceLabel, this.loaded);
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

    // --- optional folder access (Chrome/Edge) -----------------------------
    /*
     * With a directory handle for the library folder the app can do the two
     * things a plain page cannot: copy a chosen ebook into books/ itself, and
     * write data.js without a save dialog. Everything here is additive — without
     * a handle (Firefox, Safari, or permission not granted) the app behaves
     * exactly as before: you copy files yourself and press Save.
     */
    folderHandle: null,

    get folderApiAvailable() { return 'showDirectoryPicker' in window; },
    get folderReady() { return !!this.folderHandle; },

    async grantFolderAccess() {
        if (!this.folderApiAvailable) {
            alert(t('msg.noFolderApi'));
            return false;
        }
        try {
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });

            // A quick sanity check that this really is the library folder.
            try {
                await handle.getDirectoryHandle('ebook_app');
            } catch {
                if (!confirm(t('msg.wrongFolder'))) {
                    return false;
                }
            }

            this.folderHandle = handle;
            this.updateFolderUi();
            console.log('Folder access granted:', handle.name);

            // If work is already waiting to be saved, put it on disk right away.
            if (this.dirty) await this.autoSave();
            return true;
        } catch (error) {
            if (error.name === 'AbortError') return false;      // dialog dismissed

            // Chrome blocks a handful of well-known directories (home itself,
            // Desktop, Documents, Downloads, ~/.config …) and reports it as
            // "contains system files", which sends people looking in the wrong
            // place. Say what actually needs doing.
            console.error('Folder access failed:', error);
            alert(t('msg.folderBlocked'));
            return false;
        }
    },

    /* Make sure we may still write; Chrome can drop the grant between sessions. */
    async ensureFolderWritable() {
        if (!this.folderHandle) return false;
        const opts = { mode: 'readwrite' };
        if (await this.folderHandle.queryPermission(opts) === 'granted') return true;
        return await this.folderHandle.requestPermission(opts) === 'granted';
    },

    /* Write `contents` to <folder>/<...path>/<name>, creating folders as needed. */
    async writeInto(path, name, contents) {
        let dir = this.folderHandle;
        for (const part of path) dir = await dir.getDirectoryHandle(part, { create: true });
        const fileHandle = await dir.getFileHandle(name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(contents);
        await writable.close();
    },

    /* Copy a File the user picked into books/ or thumbnails/. Returns its name. */
    async copyIntoLibrary(file, folder) {
        await this.writeInto([folder], file.name, file);
        console.log(`Copied "${file.name}" into ${folder}/`);
        return file.name;
    },

    /* Silent save straight to ebook_app/data.js. Returns true if it happened. */
    async autoSave() {
        if (!this.folderHandle) return false;
        if (!await this.ensureFolderWritable()) {
            this.folderHandle = null;
            this.updateFolderUi();
            return false;
        }
        await this.writeInto(['ebook_app'], 'data.js', this.catalogueSource());
        this.dirty = false;
        this.clearDraft();
        this.hideSaveWarning();
        this.sourceLabel = t('bar.savedAuto', { count: this.books.length });
        this.showLoadBar(this.sourceLabel, true);
        return true;
    },

    /* Record a change: keep the recovery draft, then either save it to disk at
       once (folder access) or ask the user to save (manual mode). */
    async persist() {
        this.markDirty();
        if (!this.folderHandle) return;
        try {
            await this.autoSave();
        } catch (error) {
            console.error('Automatic save failed:', error);
            alert(t('msg.autoSaveFailed', { error: error.message }));
        }
    },

    updateFolderUi() {
        const btn = document.getElementById('folderAccessBtn');
        const status = document.getElementById('folderStatus');

        if (btn) {
            btn.style.display = this.folderApiAvailable && !this.folderReady ? '' : 'none';
        }
        if (status) {
            if (this.folderReady) {
                status.textContent = t('manage.mode.folder', { name: this.folderHandle.name });
            } else if (this.folderApiAvailable) {
                status.textContent = t('manage.mode.manual');
            } else {
                status.textContent = t('manage.mode.manualOnly');
            }
        }
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
        this.sourceLabel = t('bar.draftRestored', { count: this.books.length });
        this.showLoadBar(this.sourceLabel, true);
        console.log('Draft restored:', this.books.length, 'books');
    },

    discardDraft() {
        if (!confirm(t('msg.dropDraft'))) return;
        this.clearDraft();
        this.showLoadBar(this.sourceLabel, this.loaded);
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
        this.sourceLabel = t('bar.loadedFile', { name: file.name, count: this.books.length });
        this.showLoadBar(this.sourceLabel, true);
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

    /* The exact text of ebook_app/data.js — used by both the manual save and the
       automatic one, so the two can never drift apart. */
    catalogueSource() {
        return '// Electronic Library catalogue. Loaded automatically by index.html.\n' +
               '// Generated by the app — edit through the UI and press Save.\n' +
               'window.LIBRARY_DATA = ' + JSON.stringify(this.snapshot(), null, 2) + ';\n';
    },

    /* Save the catalogue as ebook_app/data.js so the next page load picks it up
       automatically. The JS wrapper is what makes auto-loading possible at all on
       a file:// page (a <script> may be loaded, a fetch() may not). */
    async saveToFile() {
        // With folder access this needs no dialog at all.
        if (this.folderHandle) {
            try {
                if (await this.autoSave()) return;
            } catch (error) {
                console.error('Automatic save failed, falling back to a dialog:', error);
            }
        }

        const contents = this.catalogueSource();

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
                this.sourceLabel = t('bar.savedTo', { name: handle.name, count: this.books.length });
                this.showLoadBar(this.sourceLabel, true);
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
        this.sourceLabel = t('bar.savedDownload', { count: this.books.length });
        this.showLoadBar(this.sourceLabel, true);
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
        // now carries that message. Put the source status back in the header so
        // the two banners never say overlapping things.
        const bar = document.getElementById('loadBar');
        if (bar?.classList.contains('draft')) {
            this.showLoadBar(this.sourceLabel, this.loaded);
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
                        <button onclick="window.library.readBook('${esc(book.filePath)}')">${t('card.read')}</button>
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
                        <button onclick="window.library.readBook('${esc(book.filePath)}')">${t('card.read')}</button>
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
                <button class="delete-btn" data-book-id="${esc(book.id)}">${t('manage.delete')}</button>
            </div>`).join('');

        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteBook(e.target.dataset.bookId));
        });
    },

    // --- books ------------------------------------------------------------

    /* Read the Add Book form. Fields are read by id: the inputs have no "name"
       attributes, so FormData (used by an earlier version) returned nothing and
       every book was stored as "Untitled / Unknown / unknown.pdf". */
    async addBook(event) {
        if (event) event.preventDefault();

        const value = (id) => (document.getElementById(id)?.value || '').trim();
        const picked = (id) => document.getElementById(id)?.files?.[0] || null;

        const title = value('bookTitle');
        const author = value('bookAuthor');
        const category = value('bookCategory');
        const bookFile = picked('bookFile');
        const thumbFile = picked('thumbnailFile');

        if (!title || !author) { alert(t('msg.needTitleAuthor')); return; }
        if (!category) { alert(t('msg.needCategory')); return; }
        if (!bookFile) { alert(t('msg.needBookFile')); return; }

        const fileName = bookFile.name;
        const thumbName = thumbFile ? thumbFile.name : '';

        // With folder access the app copies the files where they belong, so you
        // can pick them from anywhere on the disk. Without it, they must already
        // sit in books/ and thumbnails/ — only the names are recorded.
        if (this.folderHandle) {
            try {
                if (!await this.ensureFolderWritable()) throw new Error('write permission was refused');
                await this.copyIntoLibrary(bookFile, 'books');
                if (thumbFile) await this.copyIntoLibrary(thumbFile, 'thumbnails');
            } catch (error) {
                console.error('Copying the files failed:', error);
                alert(t('msg.copyFailed', { error: error.message }));
                return;
            }
        }

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
        await this.persist();
        console.log('Book added:', title);
    },

    deleteBook(id) {
        const book = this.books.find(b => String(b.id) === String(id));
        if (!book) return;
        if (!confirm(t('msg.deleteBook', { title: book.title }))) return;

        this.books = this.books.filter(b => String(b.id) !== String(id));
        ['favorites', 'readLater', 'workBooks', 'hobbyBooks'].forEach(key => {
            this[key] = (this[key] || []).filter(bookId => String(bookId) !== String(id));
        });

        this.renderAll();
        this.persist();
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
        this.sourceLabel = this.loaded
            ? t('bar.autoLoaded', { count: this.books.length })
            : t('bar.noCatalogue');
        this.showLoadBar(this.sourceLabel, this.loaded);
        this.updateFolderUi();
        this.renderAll();
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
function grantFolderAccess() { window.library.grantFolderAccess(); }
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
});
