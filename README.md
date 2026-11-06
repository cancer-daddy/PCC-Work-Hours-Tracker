# PCC Work Hours Tracker

Free offline-first PWA for personal work-hour records, with campus selections Cascade, Rock Creek, Southeast, Sylvania, and Virtual Work.

## Features
- Clock-in / clock-out with unpaid breaks (including overnight shifts), or manual paid hours.
- Edit/delete shifts; totals for each location and current Monday–Sunday week.
- Local-only browser storage; CSV backup and import; browser Print / Save as PDF.
- Offline support once loaded over HTTPS and cached by the service worker.

## Run locally
Open a Terminal in this folder and run `python3 -m http.server 8000`, then visit http://localhost:8000. For service-worker offline installation, publish the folder to an HTTPS host such as GitHub Pages. The app does not upload records to the hosting service.

## Important
This is a **personal tracker**, not an official PCC timekeeping system. It does not automatically submit timesheets or calculate payroll. Keep CSV backups: deleting site data or uninstalling an app can erase local records. Each browser/device has separate records. PDF is produced via your browser's Print / Save as PDF feature.

CSV import merges by record ID and skips existing IDs. The same shift independently created on two devices will have different IDs, so avoid importing it twice under different IDs.
