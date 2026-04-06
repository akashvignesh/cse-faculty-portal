# CSE PhD Manager Portal — University at Buffalo

A Next.js replication of the UB CSE PhD Manager Portal with full DataTables integration.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
http://localhost:3000
```

## 📦 DataTables Plugins Included

All loaded via CDN in `pages/_document.js`:

| Plugin | Purpose |
|--------|---------|
| **DataTables Core** v2.0.7 | Sorting, searching, pagination |
| **Buttons** v3.0.2 | Export to CSV, Excel, PDF, Print, Copy |
| **Select** v2.0.3 | Row selection (multi-row) |
| **Responsive** v3.0.2 | Mobile-responsive column collapsing |
| **SearchPanes** v2.3.1 | Faceted filtering panels |
| **JSZip** | Required for Excel export |
| **PDFMake** | Required for PDF export |

## 🏗️ Project Structure

```
cse-phd-portal/
├── pages/
│   ├── _app.js          ← Global CSS import
│   ├── _document.js     ← CDN scripts (jQuery + DataTables)
│   └── index.js         ← Main portal page
├── styles/
│   └── globals.css      ← All styles + DataTables overrides
├── next.config.js
└── package.json
```

## ✨ Features

- **UB Branding** — UB logo, blue color scheme, department header
- **Sidebar Navigation** — Introduction, Roster, Alerts (with badge), Teaching Prefs, Dashboard, Reports, Settings, Sign Out
- **PhD Roster Table** — 15 sample PhD students with:
  - Avatar initials with colored backgrounds
  - Clickable name & userid links
  - Campus office address
  - Faculty Advisors #1 and #2
  - Editable Funding Source dropdown
  - Funding editor & timestamp
- **DataTables Features**:
  - Sort any column (↑↓)
  - Search/filter across all columns
  - Pagination with entries-per-page control
  - Export buttons: Copy · CSV · Excel · PDF · Print
  - Column visibility toggle
  - Multi-row selection
  - Responsive layout for mobile

## 🎨 Design Notes

- Font: IBM Plex Sans + IBM Plex Mono (via Google Fonts)
- Color palette: UB Blue (#005bbb), dark navy table header, clean whites
- DataTables styled to match UB branding (blue header rows, hover states)
