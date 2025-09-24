Before finishing tasks:
- Verify admin.html loads with logged-in session and switches to 'edit' tab automatically
- Ensure images resolve in this order: IndexedDB -> localStorage -> /images/{ID}.png -> /images/{ID}.jpg -> placeholder
- Confirm logo/profile icons load from /images/logo.png and /images/profileIcon.png, with fallbacks to storage
- Test CSV import adds entries and updates localStorage.akyoDataCSV; main page auto-refreshes via storage event
- For Netlify deploy: include /images directory; verify fetch('data/akyo-data.csv') works (serve over HTTP)
