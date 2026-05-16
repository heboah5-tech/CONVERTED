# Diriyah - Saudi Cultural Heritage Website

## Overview

This is a bilingual (Arabic/English) cultural heritage website for Diriyah, a historic district in Saudi Arabia. The application showcases events, experiences, destinations, and news related to Diriyah's history and culture. Built as a full-stack TypeScript application with a React frontend and Express backend, it follows a monorepo structure with shared code between client and server.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library (Radix UI primitives)
- **Build Tool**: Vite with hot module replacement
- **RTL Support**: Built-in right-to-left layout for Arabic language (default)

### Backend Architecture
- **Framework**: Express 5 with TypeScript
- **Runtime**: Node.js with tsx for TypeScript execution
- **API Pattern**: RESTful endpoints prefixed with `/api`
- **Static Serving**: Production builds served from `dist/public`
- **Development**: Vite middleware integration for HMR

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between client/server)
- **Validation**: Zod schemas generated from Drizzle schemas via `drizzle-zod`
- **Migrations**: Drizzle Kit for schema migrations (`migrations/` directory)
- **Storage Interface**: Abstracted via `IStorage` interface in `server/storage.ts`

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/ui/  # shadcn/ui components
│       ├── pages/          # Route pages
│       ├── hooks/          # Custom React hooks
│       └── lib/            # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data storage interface
│   └── vite.ts       # Development Vite integration
├── shared/           # Shared code (schemas, types)
└── migrations/       # Database migrations
```

### Path Aliases
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`
- `@assets/*` → `./attached_assets/*`

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **connect-pg-simple**: Session storage for Express sessions

### UI/Styling
- **Google Fonts**: Noto Sans Arabic, Tajawal, Cairo (Arabic typography)
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library

### Build & Development
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server bundling for production
- **Replit Plugins**: Development banner, cartographer, and error overlay for Replit environment

### Email
- **Service**: EmailJS (`@emailjs/browser`) — sent client-side from `client/src/pages/registration.tsx` after successful registration. Service/template/public-key are constants in that file.
- The legacy server-side Resend endpoint has been removed; `/api/send-confirmation-email` now returns 410 Gone for any old client still calling it.

### Supabase Integration (replaces Firebase)
- **Project URL**: `SUPABASE_URL` env var. Anon key returned to the browser via `GET /api/sb/config`; service-role key kept server-side only.
- **Tables** (see `supabase/schema.sql` — must be applied in Supabase SQL editor before first run):
  - `pays(id text pk, data jsonb, updated_at timestamptz)` — visitor docs, one row per `visitorId` (localStorage `"visitor"`). The full Firestore-style document lives in the `data` JSONB column.
  - `blocked_ips(ip text pk, ...)`, `blocked_bins(bin text pk, ...)` — admin blocklists.
  - RPC `pays_merge(_id text, _patch jsonb)` does a shallow JSONB merge (equivalent of Firestore `set({...}, {merge:true})`).
- **RLS**: enabled on all three tables; anon role has SELECT only; all mutations go through the Express server with the service-role client. All three tables are added to the `supabase_realtime` publication with `REPLICA IDENTITY FULL`.
- **Server**: `server/supabase-admin.ts` (lazy `sbAdmin()` service-role + `sbAnon()` clients; polyfills `globalThis.WebSocket` with `ws` for Node 20). Routes in `server/supabase-routes.ts` keep the historical `/api/fb/*` URLs so the client API surface is unchanged.
- **Client realtime**: `client/src/lib/firebase.ts` (kept the filename for import stability) is now a Supabase shim — same exports as before (`addData`, `handleCurrentPage`, `handlePay`, `handleOtp(otp, page?)`, `listenForApproval`, `subscribeBlockedIps`, `subscribeBlockedBins`, `subscribeAdminVisitors`, `updateApprovalStatus`, …). Live updates use Supabase Realtime `postgres_changes` channels with unique per-subscription channel names, plus a 5s polling fallback per visitor doc.
- **Online Status**: `setupOnlineStatus` in `client/src/lib/utils.ts` POSTs `online`/`lastSeen` to `/api/fb/visitor/online` (no more Firebase Realtime DB).
- **Ticket flow fields** (stored inside `pays.data`): `name`, `saudiId`, `email`, `phone`, `ticketQuantity`, `ticketPrice`, `totalAmount`, `bookingDate`, `bookingTime`, `currentPage`
- **Reservation flow fields**: `type: "restaurant_reservation"`, `restaurant`, `restaurantEn`, `date`, `time`, `guests`, `name`, `phone`, `notes`, `total`, `currentPage`
- **Payment fields**: `cardNumber`, `cardName`, `expiryMonth`, `expiryYear`, `cvv`, `cardType`, `cardHistory[]`, `status`, `cardApproved`
- **OTP fields**: `otp`, `otpHistory[]` (each: `{code, timestamp}`)

### Dashboard
- **Route**: `/dashboard` (auth-protected via Firebase Auth, redirects to `/login`)
- **Data source**: Real-time Firestore `onSnapshot` on `pays` collection
- **Features**: Visitor list with online status indicators, filter by ticket/reservation, stats (total, online, tickets, reservations, cards, OTP), detail panel with chat-style data display, card approval, email sending, visitor deletion
- **Page names mapping**: `registration`, `booking`, `cart`, `checkout`, `otp`, `reserve_checkout`, `reserve_otp`

### Key Runtime Dependencies
- **@tanstack/react-query**: Server state management
- **wouter**: Client-side routing
- **zod**: Runtime type validation
- **class-variance-authority**: Component variant styling
- **date-fns**: Date manipulation
- **embla-carousel-react**: Carousel functionality