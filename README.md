# FreightVis Frontend (Next.js MVP)

## Prereqs
- Node 20+

## Setup
```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend: http://localhost:3000

## Routes
- `/incident/list` (list)
- `/incident/0/details` (create)
- `/incident/{id}/details` (details/edit)

## API base URL
Set in `.env.local`:
`NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`
