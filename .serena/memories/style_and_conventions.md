Coding: Vanilla JS, readable names, minimal global leaks. No formatter configured; keep indentation and style from existing files.
Data: CSV columns order fixed (ID, appearance, nickname, avatarName, attribute, notes, creator, avatarUrl). ID is three-digit string. Attributes separated by comma or Japanese comma.
UI: Tailwind classes in HTML with custom CSS. Avoid changing indentation/whitespace drastically.
Images: Prefer PNG now (but code falls back to JPG). Place static images in /images: 001.png (etc), logo.png, profileIcon.png.
Auth: sessionStorage.akyoAdminAuth = 'owner'|'admin'.
Tabs: admin.js switchTab('add'|'edit'|'tools'), default to 'edit' after data load.
