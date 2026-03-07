# Logistics RAG Frontend

A modern Next.js frontend for the Logistics Document Intelligence system.

## Features

- 📄 PDF Document Upload with drag & drop
- 💬 AI-powered chat interface
- 🎨 Modern glassmorphism UI design
- 📱 Fully responsive
- ✨ Smooth animations with Framer Motion

## Prerequisites

- Node.js 18+ 
- Backend server running on http://localhost:8000

## Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```
bash
npm install
```

3. Start the development server:
```
bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## Project Structure

```
frontend/
├── app/
│   ├── globals.css      # Global styles with Tailwind
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main application page
├── components/          # React components (if needed)
├── public/              # Static assets
├── package.json         # Dependencies
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── next.config.js       # Next.js configuration
```

## API Integration

The frontend communicates with the backend at `http://localhost:8000`:

- `POST /upload` - Upload PDF documents
- `POST /chat` - Send chat messages

Update `.env.local` to change the API URL.
