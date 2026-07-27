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
        'nav.grantFolder': '📁 Grant folder access',
        'nav.grantFolder.title': 'Select the ebook-library folder so the app can copy books into books/ and save the catalogue by itself',
        'nav.theme.title': 'Day / night theme',
        'nav.lang.title': 'Switch interface language',
        'app.title': 'Electronic Library',

        // catalogue status bar
        'bar.loading': 'Loading catalogue…',
        'bar.autoLoaded': 'Catalogue loaded automatically — {count} book(s).',
        'bar.noCatalogue': 'No catalogue found (ebook_app/data.js) — you can load a file manually:',
        'bar.loadedFile': 'Loaded "{name}" — {count} book(s).',
        'bar.savedTo': 'Saved to "{name}" — {count} book(s).',
        'bar.savedDownload': 'Saved — {count} book(s) downloaded as data.js.',
        'bar.savedAuto': 'Saved automatically — {count} book(s).',
        'bar.draftFound': 'Changes you never saved ({when}) are still here. Showing the saved catalogue — restore them or drop them?',
        'bar.draftRestored': 'Restored {count} book(s) from unsaved changes.',
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
        'manage.mode.folder': 'Folder access on ({name}): books are copied for you and changes save themselves.',
        'manage.mode.manual': 'Manual mode: copy files into books/ yourself and press Save. Grant folder access to automate both — select the ebook-library folder itself (Chrome refuses your home, Documents or Downloads folder).',
        'manage.mode.manualOnly': 'Manual mode: copy files into books/ yourself and press Save. (This browser cannot automate it — Chrome or Edge can.)',
        'manage.addHint': 'Fill in the details and pick the ebook file. In manual mode only the file <em>name</em> is recorded, so the file must already be in <code>books/</code> (and its cover in <code>thumbnails/</code>). With folder access granted, the app copies both for you from wherever you picked them.',
        'form.title': 'Title',
        'form.author': 'Author',
        'form.year': 'Year',
        'form.description': 'Short description',
        'form.bookFile': 'Ebook file (in books/)',
        'form.coverFile': 'Cover image (in thumbnails/, optional)',
        'form.selectCategory': 'Select Category',
        'form.submit': 'Add Book',

        // manage: categories, saving, book list
        'manage.categories': 'Manage Categories',
        'manage.categoryName': 'Category name',
        'manage.addCategory': 'Add Category',
        'manage.save': 'Save Library',
        'manage.saveCatalogue': 'Save catalogue (data.js)',
        'manage.saveHint': 'Save writes <code>ebook_app/data.js</code>, which the app loads automatically next time — in Chrome/Edge you can overwrite the existing file in place. A browser cannot write to disk on its own, so this click is the one manual step.',
        'manage.books': 'Manage Books',
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
        'msg.copyFailed': 'Could not copy the files into the library folder:\n{error}\n\nThe book was not added.',
        'msg.deleteBook': 'Delete "{title}" from the library?\n(The file in books/ is not touched.)',
        'msg.deleteCategory': 'Delete category "{name}"?',
        'msg.deleteCategoryUsed': 'Delete category "{name}"?\n{count} book(s) still use it and will keep the name.',
        'msg.categoryExists': 'Category "{name}" already exists.',
        'msg.dropDraft': 'Drop those unsaved changes and keep the saved catalogue?',
        'msg.downloaded': 'data.js was downloaded (check your Downloads folder).\nMove it into the ebook_app folder, replacing the old one.',
        'msg.autoSaveFailed': 'Could not save automatically — use "Save catalogue" instead.\n{error}',
        'msg.noFolderApi': 'This browser has no folder access API (Chrome or Edge do). The manual way keeps working: copy files into books/ yourself and press Save.',
        'msg.wrongFolder': 'That folder has no "ebook_app" inside — is it really the ebook-library folder? Choose "Cancel" to pick another one.',
        'msg.folderBlocked': 'Chrome refuses that folder. It blocks a few well-known ones — your home folder itself, Desktop, Documents, Downloads, ~/.config — even though it says "system files".\n\nPick the ebook-library folder itself (go inside it), not the folder above it. Anything nested inside those blocked folders is fine.'
    },

    ru: {
        'nav.library': 'Библиотека',
        'nav.manage': 'Управление',
        'nav.grantFolder': '📁 Доступ к папке',
        'nav.grantFolder.title': 'Выберите папку ebook-library, чтобы приложение копировало книги в books/ и сохраняло каталог само',
        'nav.theme.title': 'Светлая / тёмная тема',
        'nav.lang.title': 'Сменить язык интерфейса',
        'app.title': 'Электронная библиотека',

        'bar.loading': 'Загрузка каталога…',
        'bar.autoLoaded': 'Каталог загружен автоматически — книг: {count}.',
        'bar.noCatalogue': 'Каталог не найден (ebook_app/data.js) — можно загрузить файл вручную:',
        'bar.loadedFile': 'Загружен «{name}» — книг: {count}.',
        'bar.savedTo': 'Сохранено в «{name}» — книг: {count}.',
        'bar.savedDownload': 'Сохранено — книг: {count}, файл data.js скачан.',
        'bar.savedAuto': 'Сохранено автоматически — книг: {count}.',
        'bar.draftFound': 'Остались несохранённые изменения ({when}). Показан сохранённый каталог — восстановить их или отбросить?',
        'bar.draftRestored': 'Восстановлено из несохранённого — книг: {count}.',
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
        'manage.mode.folder': 'Доступ к папке выдан ({name}): книги копируются автоматически, изменения сохраняются сами.',
        'manage.mode.manual': 'Ручной режим: копируйте файлы в books/ самостоятельно и нажимайте «Сохранить». Выдайте доступ к папке, чтобы это делалось автоматически — выбирайте саму папку ebook-library (домашний каталог, «Документы» и «Загрузки» Chrome не отдаёт).',
        'manage.mode.manualOnly': 'Ручной режим: копируйте файлы в books/ самостоятельно и нажимайте «Сохранить». (Этот браузер не умеет автоматизировать — умеют Chrome и Edge.)',
        'manage.addHint': 'Заполните поля и выберите файл книги. В ручном режиме сохраняется только <em>имя</em> файла, поэтому сам файл должен уже лежать в <code>books/</code> (а обложка — в <code>thumbnails/</code>). При выданном доступе к папке приложение скопирует оба файла само, откуда бы вы их ни выбрали.',
        'form.title': 'Название',
        'form.author': 'Автор',
        'form.year': 'Год',
        'form.description': 'Краткое описание',
        'form.bookFile': 'Файл книги (в books/)',
        'form.coverFile': 'Обложка (в thumbnails/, необязательно)',
        'form.selectCategory': 'Выберите категорию',
        'form.submit': 'Добавить книгу',

        'manage.categories': 'Категории',
        'manage.categoryName': 'Название категории',
        'manage.addCategory': 'Добавить категорию',
        'manage.save': 'Сохранение каталога',
        'manage.saveCatalogue': 'Сохранить каталог (data.js)',
        'manage.saveHint': 'Сохранение пишет <code>ebook_app/data.js</code>, который загружается автоматически при следующем запуске — в Chrome/Edge можно перезаписать существующий файл на месте. Браузер не может писать на диск сам, поэтому это нажатие — единственное ручное действие.',
        'manage.books': 'Книги',
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
        'msg.copyFailed': 'Не удалось скопировать файлы в папку библиотеки:\n{error}\n\nКнига не добавлена.',
        'msg.deleteBook': 'Удалить «{title}» из библиотеки?\n(Файл в books/ останется на месте.)',
        'msg.deleteCategory': 'Удалить категорию «{name}»?',
        'msg.deleteCategoryUsed': 'Удалить категорию «{name}»?\nЕё ещё используют книг: {count} — у них название сохранится.',
        'msg.categoryExists': 'Категория «{name}» уже существует.',
        'msg.dropDraft': 'Отбросить несохранённые изменения и оставить сохранённый каталог?',
        'msg.downloaded': 'Файл data.js скачан (проверьте папку «Загрузки»).\nПереместите его в папку ebook_app, заменив старый.',
        'msg.autoSaveFailed': 'Не удалось сохранить автоматически — воспользуйтесь кнопкой «Сохранить каталог».\n{error}',
        'msg.noFolderApi': 'В этом браузере нет API доступа к папке (есть в Chrome и Edge). Ручной способ продолжает работать: копируйте файлы в books/ сами и нажимайте «Сохранить».',
        'msg.wrongFolder': 'В выбранной папке нет «ebook_app» — это точно папка ebook-library? Нажмите «Отмена», чтобы выбрать другую.',
        'msg.folderBlocked': 'Chrome не отдаёт эту папку. Он блокирует несколько известных каталогов — сам домашний каталог, «Рабочий стол», «Документы», «Загрузки», ~/.config — хотя пишет про «системные файлы».\n\nВыберите саму папку ebook-library (зайдите внутрь неё), а не папку выше. Всё, что лежит внутри заблокированных каталогов, доступно нормально.'
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
