# CSE Faculty Portal

Single-page Next.js application for the CSE department faculty listing.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Modes

Create `.env.local` from the example values below.

### Local mode

```bash
NEXT_PUBLIC_FACULTY_DATA_MODE=local
NEXT_PUBLIC_FACULTY_API_URL=
```

Local mode uses only the sample faculty data in `data/facultyMockData.js`.

### Dev mode

```bash
NEXT_PUBLIC_FACULTY_DATA_MODE=dev
NEXT_PUBLIC_FACULTY_API_URL=https://your-api.example.com/faculty
```

Dev mode calls the configured API only. If the API URL is missing or the request fails, the UI shows an explicit error and does not substitute mock data.

## Notes

- The header branding uses copied assets from `D:\Code\cse-style\web`.
- Editor assets from `C:\Users\Windows\Downloads\Editor-NodeJS-2.5.2\Editor-NodeJS-2.5.2` are copied into `public/vendor/editor`.
- The supplied Editor JavaScript is an expired trial build dated `2026-04-04`, so it is not executed by the live page.
