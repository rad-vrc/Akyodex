Project: Akyoずかん (Akyodex)
Purpose: Client-side static web app to browse 500+ Akyo entries, with admin UI for adding/editing via CSV and storing images in IndexedDB/LocalStorage, and static fallback images in /images.
Tech stack: HTML5, CSS3 (Tailwind via CDN + custom kid-friendly.css), JavaScript (vanilla ES6). No build step. Fonts: Google Fonts. Icons: Font Awesome.
Structure:
- index.html: main zukan UI (search, filter, grid/list, modal)
- admin.html: admin UI (login, new, edit/delete, tools: CSV import, ID renumber). Stats and export UI removed.
- data/akyo-data.csv: base CSV
- js/: main.js, admin.js, image-loader.js, storage-manager.js, storage-adapter.js
- css/kid-friendly.css: theme
- images/: static fallback images: {ID}.png/jpg, plus logo.png and profileIcon.png
Storage: CSV in localStorage.akyoDataCSV (fallback to data/akyo-data.csv). Images in IndexedDB (store 'images'), fallback to localStorage.akyoImages, final fallback to /images/{ID}.png or .jpg.
Conventions: 3-digit IDs (001..), attributes comma/ja comma separated. Admin owner password RadAkyo, admin Akyo (sessionStorage.akyoAdminAuth).