# ShopShield 🛡️

**ShopShield** is a **web-based management system for multi-location mobile repair shops**.  
It replaces paper logs, WhatsApp messages, and manual spreadsheets with a **single app that tracks repairs, sales, inventory, and employee activity in real-time**.  

Designed for shop owners, ShopShield **prevents theft, ensures accountability, and provides actionable insights** across all locations.

---

## 🚀 Features

### 🔧 Jobs & Repair Management
- Create repair tickets with customer info, device model, and issue description.
- Track job status: `pending → in_progress → completed → collected`.
- Upload before and after repair photos stored in Supabase Storage.
- Assign technicians to jobs and track who worked on what.
- Link used parts to jobs; automatically deduct from inventory.
- View repair history per customer and device.

### 📦 Inventory & Anti-Theft
- Track individual parts with **unique QR codes**.
- Automatic low-stock alerts per shop.
- Surprise audits for anti-theft:
  - Scan shelves to reconcile inventory.
  - Unscanned items flagged as lost.
- Activity logs track every part movement and usage.
- Immutable logging ensures accountability.

### 💰 Sales & POS
- Mobile-first **quick checkout** for retail and repair services.
- Predefined repair services & retail items with auto-filled prices.
- Record default price, final charged price, discount, and payment method.
- Warnings for heavily discounted sales (editable but flagged).
- Immutable records — no edits or deletions.
- Multi-shop support — each sale linked to the correct shop.

### 📊 Dashboard & Reporting
- Real-time metrics:
  - Active jobs
  - Revenue per shop / global
  - Low-stock parts
  - Connected shops
- Per-shop dashboards with recent jobs and alerts.
- Daily and weekly summary emails & Telegram notifications.
- Future roadmap includes charts for profits and technician performance.

### 👥 Role-Based Access
- **Owner:** full access to dashboards, reports, audits, and employee management.
- **Employee/Technician:** limited access to jobs, inventory usage, and sales recording.
- Owners can manage employee roles and permissions.

### 🛠️ Tech Stack
- **Frontend:** React + TypeScript + Vite
- **UI Library:** shadcn/ui
- **Backend / Database / Auth:** Supabase (PostgreSQL + Auth + Storage)
- **Notifications:** Email via Resend, Telegram Bot API
- **Deployment:** Frontend on Vercel, backend & DB on Supabase
- **Multi-tenant architecture:** org_id based isolation, Row Level Security (RLS)

---

## 🗂️ Database Schema Highlights
- `organizations` – each repair shop group
- `shops` – individual shops/cafés per organization
- `profiles` – employees, technicians, owners
- `jobs` – repair tickets
- `parts` & `inventory_items` – parts catalog & physical inventory
- `job_parts` – parts used per job
- `sales` – retail and repair sales
- `activity_logs` – immutable logs for audits
- `job_photos` – before/after repair photos
- `notifications` – alerts in-app, email, or Telegram
- `alert_logs` – for auditing automated notifications

---

## 📌 Installation & Setup

1. **Clone the repository**

```bash
git clone https://github.com/<your-username>/ShopShield.git
cd ShopShield
```
2. **Install dependencies**

```bash
pnpm install
```

3. **Setup environment variables**

```bash
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>

```

4. **Run development server**

```bash
pnpm dev
```
