# knowmood

A minimal, intimate web app built around an interactive 3D reversible plushie (🌸 Happy / 🌧️ Unhappy). Connect with exactly one person to share your emotional headspace in real-time.

## Features

- **Exclusive 1-to-1 Bond**: You can only bond with one special person at a time.
- **Mutual Agreement to Break**: A bond can only be dissolved when both partners agree, preventing impulsive ghosting and encouraging open communication.
- **3D Interactive Reversible Plushie**: Smooth 3D reversible plushie rendered with Three.js & `@react-three/fiber`, supporting continuous drag rotation and smooth `motion/react` step rotation buttons.
- **Real-Time Mood Synchronization**: Mood flips (Happy ↔ Unhappy) reflect instantly for your partner.
- **Mobile-First Aesthetic UI**: Warm cozy aesthetic with plush press physics, soft shadows, and clean typography.
- **Authentication**: Intimate username-first authentication powered by Better Auth.
- **Database**: Neon Serverless PostgreSQL with Drizzle ORM.

## Tech Stack

- **Framework**: TanStack Start & TanStack Router
- **3D Graphics**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **Animations**: `motion` (`motion/react`)
- **Database**: Neon PostgreSQL & Drizzle ORM
- **Auth**: Better Auth
- **Styling**: Tailwind CSS & Lucide Icons

## Getting Started

1. Clone repository:
   ```bash
   git clone https://github.com/kirtanpatel01/knowmood.git
   cd knowmood
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env.local` and add your Neon PostgreSQL connection string:
   ```bash
   cp .env.example .env.local
   ```

4. Push schema to database:
   ```bash
   npx drizzle-kit push
   ```

5. Run local development server:
   ```bash
   npm run dev
   ```
