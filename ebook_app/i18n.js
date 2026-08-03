/*
 * Interface translations.
 *
 * Static markup is translated through attributes — data-i18n (text),
 * data-i18n-placeholder, data-i18n-title — so index.html stays readable and no
 * string is duplicated in the logic. Everything the code produces at runtime goes
 * through t('key', {param: value}).
 *
 * Adding a language means adding one more block below and one more entry in
 * LANGUAGES; nothing else in the app needs to change.
 */

'use strict';

const LANGUAGES = ['en', 'ru'];
const PREF_LANG = 'ebooklib.lang';

const TRANSLATIONS = {
    en: {
        // header / navigation
        'nav.library': 'Library',
        'nav.manage': 'Manage',
        'nav.theme.title': 'Day / night theme',
        'nav.lang.title': 'Switch interface language',
        'app.title': 'Electronic Library',

        // catalogue status bar (hidden unless the user has to act)
        'bar.noCatalogue': 'No catalogue found (data.js next to index.html) — you can load a file manually:',
        'bar.draftFound': 'Changes you never saved ({when}) are still here. Showing the saved catalogue — restore them or drop them?',
        'bar.load': 'Load library',
        'bar.restore': 'Restore changes',
        'bar.keepSaved': 'Keep saved version',

        // unsaved-changes banner
        'warn.unsaved': 'Library changed — save it before closing the browser!',
        'warn.saveNow': 'Save now',
        'warn.dismiss': 'Dismiss',

        // filters and view
        'filter.search': 'Search books...',
        'filter.allCategories': 'All Categories',
        'filter.allAuthors': 'All Authors',
        'filter.allYears': 'All Years',
        'filter.allTypes': 'All Types',
        'filter.allBooks': 'All Books',
        'filter.favorites': '⭐ Favorites',
        'filter.readLater': '📚 Read Later',
        'filter.workBooks': '💼 Work Books',
        'filter.hobbyBooks': '🎯 Hobby Books',
        'view.grid': 'Grid',
        'view.list': 'List',

        // book cards
        'card.author': 'Author:',
        'card.category': 'Category:',
        'card.year': 'Year:',
        'card.file': 'File:',
        'card.download': 'Download',
        'card.read': 'Read',
        'viewer.close': 'Close (Esc)',
        'viewer.cantPreview': 'The browser cannot display .{ext} files. Download the book and open it in a desktop reader.',
        'viewer.openTab': 'Open in new tab',
        'tag.favorites': 'Favorite',
        'tag.readLater': 'Read later',
        'tag.workBooks': 'Work',
        'tag.hobbyBooks': 'Hobby',
        'tag.on': ' (on)',

        // placeholders instead of cards
        'empty.noCatalogue': 'No catalogue loaded. Use <strong>Load library</strong> above to open your data.js.',
        'empty.library': 'The library is empty. Add books in the Manage section.',
        'empty.noMatches': 'No books match the current filters.',
        'empty.adminBooks': 'No books in the library.',

        // manage: add book
        'manage.addBook': 'Add Book',
        'manage.addHint': 'Fill in the details and pick the ebook file. Only the file <em>name</em> is recorded, so the file must already be in <code>books/</code> (and its cover in <code>thumbnails/</code>) next to index.html.',
        'form.title': 'Title',
        'form.author': 'Author',
        'form.year': 'Year',
        'form.description': 'Short description',
        'form.bookFile': 'Ebook file (in books/)',
        'form.coverFile': 'Cover image (in thumbnails/, optional)',
        'form.selectCategory': 'Select Category',
        'form.submit': 'Add Book',
        'form.submitEdit': 'Save changes',
        'form.cancelEdit': 'Cancel editing',
        'manage.editingHint': 'Editing "{title}". Pick files only to replace the current ones ({file}).',

        // manage: categories, saving, book list
        'manage.categories': 'Manage Categories',
        'manage.categoryName': 'Category name',
        'manage.addCategory': 'Add Category',
        'manage.save': 'Save Library',
        'manage.saveCatalogue': 'Save library',
        'manage.saveHint': 'Saving opens a save dialog for <code>data.js</code> — put it next to <code>index.html</code>, replacing the old one, and the app will load it automatically next time. Chrome/Edge remember the folder, so after the first save the dialog opens right there. Firefox/Safari download the file instead — move it out of Downloads yourself.',
        'manage.books': 'Manage Books',
        'manage.edit': 'Edit',
        'manage.delete': 'Delete',
        'admin.meta': 'Author: {author} | Category: {category}',
        'admin.metaYear': ' | Year: {year}',
        'admin.file': 'File: {path}',

        // messages
        'msg.pickFile': 'Choose a catalogue file (data.js or data.json) first.',
        'msg.badJson': 'That file is not a readable catalogue (expected JSON, or a data.js wrapper).',
        'msg.notCatalogue': 'That file does not look like a catalogue (no "books" array).',
        'msg.needTitleAuthor': 'Title and Author are required.',
        'msg.needCategory': 'Choose a category.',
        'msg.needBookFile': 'Choose the ebook file.',
        'msg.deleteBook': 'Delete "{title}" from the library?\n(The file in books/ is not touched.)',
        'msg.deleteCategory': 'Delete category "{name}"?',
        'msg.deleteCategoryUsed': 'Delete category "{name}"?\n{count} book(s) still use it and will keep the name.',
        'msg.categoryExists': 'Category "{name}" already exists.',
        'msg.dropDraft': 'Drop those unsaved changes and keep the saved catalogue?',
        'msg.downloaded': 'data.js was downloaded (check your Downloads folder).\nMove it next to index.html, replacing the old one.'
    },

    ru: {
        'nav.library': 'Библиотека',
        'nav.manage': 'Управление',
        'nav.theme.title': 'Светлая / тёмная тема',
        'nav.lang.title': 'Сменить язык интерфейса',
        'app.title': 'Электронная библиотека',

        'bar.noCatalogue': 'Каталог не найден (data.js рядом с index.html) — можно загрузить файл вручную:',
        'bar.draftFound': 'Остались несохранённые изменения ({when}). Показан сохранённый каталог — восстановить их или отбросить?',
        'bar.load': 'Загрузить каталог',
        'bar.restore': 'Восстановить',
        'bar.keepSaved': 'Оставить сохранённое',

        'warn.unsaved': 'Каталог изменён — сохраните его перед закрытием браузера!',
        'warn.saveNow': 'Сохранить',
        'warn.dismiss': 'Скрыть',

        'filter.search': 'Поиск книг...',
        'filter.allCategories': 'Все категории',
        'filter.allAuthors': 'Все авторы',
        'filter.allYears': 'Все годы',
        'filter.allTypes': 'Все форматы',
        'filter.allBooks': 'Все книги',
        'filter.favorites': '⭐ Избранное',
        'filter.readLater': '📚 Прочитать позже',
        'filter.workBooks': '💼 Для работы',
        'filter.hobbyBooks': '🎯 Для хобби',
        'view.grid': 'Плитка',
        'view.list': 'Список',

        'card.author': 'Автор:',
        'card.category': 'Категория:',
        'card.year': 'Год:',
        'card.file': 'Файл:',
        'card.download': 'Скачать',
        'card.read': 'Читать',
        'viewer.close': 'Закрыть (Esc)',
        'viewer.cantPreview': 'Браузер не умеет показывать файлы .{ext}. Скачайте книгу и откройте её в программе-читалке.',
        'viewer.openTab': 'Открыть в новой вкладке',
        'tag.favorites': 'Избранное',
        'tag.readLater': 'Прочитать позже',
        'tag.workBooks': 'Для работы',
        'tag.hobbyBooks': 'Для хобби',
        'tag.on': ' (включено)',

        'empty.noCatalogue': 'Каталог не загружен. Нажмите <strong>Загрузить каталог</strong> выше и выберите свой data.js.',
        'empty.library': 'Библиотека пуста. Добавьте книги в разделе «Управление».',
        'empty.noMatches': 'Нет книг, подходящих под фильтры.',
        'empty.adminBooks': 'В библиотеке нет книг.',

        'manage.addBook': 'Добавить книгу',
        'manage.addHint': 'Заполните поля и выберите файл книги. Сохраняется только <em>имя</em> файла, поэтому сам файл должен уже лежать в <code>books/</code> (а обложка — в <code>thumbnails/</code>) рядом с index.html.',
        'form.title': 'Название',
        'form.author': 'Автор',
        'form.year': 'Год',
        'form.description': 'Краткое описание',
        'form.bookFile': 'Файл книги (в books/)',
        'form.coverFile': 'Обложка (в thumbnails/, необязательно)',
        'form.selectCategory': 'Выберите категорию',
        'form.submit': 'Добавить книгу',
        'form.submitEdit': 'Сохранить изменения',
        'form.cancelEdit': 'Отменить редактирование',
        'manage.editingHint': 'Редактируется «{title}». Файлы выбирайте только чтобы заменить текущие ({file}).',

        'manage.categories': 'Категории',
        'manage.categoryName': 'Название категории',
        'manage.addCategory': 'Добавить категорию',
        'manage.save': 'Сохранение каталога',
        'manage.saveCatalogue': 'Сохранить библиотеку',
        'manage.saveHint': 'Сохранение открывает диалог сохранения файла <code>data.js</code> — положите его рядом с <code>index.html</code>, заменив старый, и при следующем запуске он загрузится автоматически. Chrome/Edge запоминают папку, поэтому после первого раза диалог открывается сразу в ней. Firefox/Safari вместо этого скачивают файл — перенесите его из «Загрузок» вручную.',
        'manage.books': 'Книги',
        'manage.edit': 'Редактировать',
        'manage.delete': 'Удалить',
        'admin.meta': 'Автор: {author} | Категория: {category}',
        'admin.metaYear': ' | Год: {year}',
        'admin.file': 'Файл: {path}',

        'msg.pickFile': 'Сначала выберите файл каталога (data.js или data.json).',
        'msg.badJson': 'Этот файл не читается как каталог (ожидается JSON или обёртка data.js).',
        'msg.notCatalogue': 'Этот файл не похож на каталог (нет массива «books»).',
        'msg.needTitleAuthor': 'Название и автор обязательны.',
        'msg.needCategory': 'Выберите категорию.',
        'msg.needBookFile': 'Выберите файл книги.',
        'msg.deleteBook': 'Удалить «{title}» из библиотеки?\n(Файл в books/ останется на месте.)',
        'msg.deleteCategory': 'Удалить категорию «{name}»?',
        'msg.deleteCategoryUsed': 'Удалить категорию «{name}»?\nЕё ещё используют книг: {count} — у них название сохранится.',
        'msg.categoryExists': 'Категория «{name}» уже существует.',
        'msg.dropDraft': 'Отбросить несохранённые изменения и оставить сохранённый каталог?',
        'msg.downloaded': 'Файл data.js скачан (проверьте папку «Загрузки»).\nПереместите его в папку библиотеки, рядом с index.html, заменив старый.'
    }
};

/* Current language: a previous choice, otherwise the browser's preference. */
let currentLang = localStorage.getItem(PREF_LANG)
    || (String(navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en');
if (!LANGUAGES.includes(currentLang)) currentLang = 'en';

/* Translate a key, substituting {placeholders}. Falls back to English, then to
   the key itself, so a missing translation is visible but never breaks the page. */
function t(key, params) {
    let text = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
    if (params) {
        for (const [name, value] of Object.entries(params)) {
            text = text.replaceAll(`{${name}}`, String(value));
        }
    }
    return text;
}

function getLang() { return currentLang; }

function setLang(lang) {
    if (!LANGUAGES.includes(lang)) return;
    currentLang = lang;
    localStorage.setItem(PREF_LANG, lang);
    document.documentElement.setAttribute('lang', lang);
    applyStaticTranslations();
}

/* Fill every element in the markup that carries a data-i18n* attribute. */
function applyStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.innerHTML = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle);
    });
    const langBtn = document.getElementById('langToggle');
    if (langBtn) langBtn.textContent = currentLang === 'ru' ? 'EN' : 'RU';
}
