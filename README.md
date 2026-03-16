#ShopShield 🛡️

ShopShield is a web-based management system for multi-location mobile repair shops. It replaces paper logs, WhatsApp messages, and manual spreadsheets with a single app that tracks repairs, sales, inventory, and employee activity in real-time.

Designed for small business owners, ShopShield prevents theft, ensures accountability, and provides actionable insights across all locations.

##🚀 Features

###🔧 Jobs & Repair Management

Create repair tickets with customer info, device model, and issue description.

Track job status: pending → in_progress → completed → collected.

Upload before/after repair photos.

Assign technicians to jobs and track who worked on what.

###📦 Inventory & Anti-Theft

Track individual parts with unique QR codes.

Automatic low-stock alerts.

Surprise audits for anti-theft: scan shelves to reconcile inventory.

Activity logs track who used what part and when.

###💰 Sales & POS

Mobile-first quick checkout for retail and repair services.

Track default price, final charged price, discounts, and payment method.

Warnings for heavily discounted sales.

Immutable records — no edits or deletions.

###📊 Dashboard & Reporting

Real-time metrics: active jobs, revenue, low-stock parts, connected shops.

Per-shop and global reports for owners.

Daily summary emails and notifications (email & Telegram).

###👥 Role-Based Access

Owner: full access to reports, audits, employee management.

Employee: limited access — create jobs, update statuses, use inventory.

###🛠️ Tech Stack

Frontend: React + TypeScript + Vite

UI Library: shadcn/ui

Backend / Database / Auth: Supabase (PostgreSQL + Auth + Storage)

Notifications: Email (Resend) & Telegram Bot API

Deployment: Vercel (frontend) + Supabase (backend)

##⚡ Installation

Clone the repository

git clone https://github.com/<your-username>/ShopShield.git
cd ShopShield

Install dependencies

pnpm install

Run the development server

pnpm dev

Setup Supabase:

Create a Supabase project.

Run the provided SQL schema to create all tables and policies.

Add your SUPABASE_URL and SUPABASE_ANON_KEY in .env.

##🗂️ Database Schema Highlights

jobs: repair tickets

parts & inventory_items: parts catalog & physical inventory

job_parts: links parts to jobs

sales: stores retail and repair sales

activity_logs: immutable log of every action

job_photos: proof-of-repair photo storage

##📌 Usage

Owners can view dashboards, reports, and audit logs.

Employees can create jobs, update job statuses, and consume inventory.

Surprise audits prevent theft and track missing parts.

Sales are logged instantly, with warnings for abnormal discounts.

##🌐 Deployment

Frontend: Deploy on Vercel

Backend & DB: Hosted on Supabase

Notifications: Email via Resend, Telegram via Bot API

##📈 Roadmap / Future Features

Offline support (PWA) for unreliable internet connections.

Automated weekly reports to Telegram.

Enhanced reporting with charts (profit, technician performance).

Customer database for repeat repairs & loyalty tracking.

Multi-organization SaaS support for other shops.

🧾 License

MIT © Jibreel Faris
