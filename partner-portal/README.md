# Altruist Partner Portal

Where a prescription goes after a patient sends it. A pharmacist signs in,
passes two-factor, sees the queue, opens a prescription, and approves or
rejects it. The patient's app updates and they get a notification.

Next.js 16 (App Router), Supabase auth. Designs: Figma *Partner Portal* page
(`MXZvKkbrOrU54cnfPHJF4O`, frames 46:2, 46:100, 147:182, 147:232 …).

## What is built

| Screen | Route | Status |
| --- | --- | --- |
| Sign in | `/login` | Built |
| Two-factor (authenticator app) | `/two-factor` | Built |
| Prescription queue | `/prescriptions` | Built |
| Review prescription | `/prescriptions/[id]` | Built |
| Incoming orders | `/orders` | Built (read-only) |
| Dashboard, Fulfilment, Inventory, Payouts, Staff, Settings | `/[section]` | "Coming next" page |

## How it is kept safe

The portal holds **no service-role key**. It signs in as the staff member and
calls the `portal_*` functions from `supabase/migrations/0018_partner_portal.sql`,
which check in the database that the caller:

- is active staff at a pharmacy (`pharmacy_staff`),
- has a two-factor (`aal2`) session — a password alone opens nothing,
- is a registered pharmacist (`can_approve`, which requires a PC number) to approve or reject.

Opening a prescription writes `prescription_access` first. The image is only
readable for 15 minutes after that, by the person who opened it, through a
10-minute signed link. Patients can see this access log in the app.

## Setup

1. **Apply the migration** `supabase/migrations/0018_partner_portal.sql`
   (Supabase dashboard → SQL editor, or `npx supabase db push`).

2. **Create the pharmacist's login**: Supabase dashboard → Authentication →
   Users → *Add user* (email + password, tick *Auto confirm*).

3. **Make them staff** (SQL editor), with their real name and Pharmacy
   Council number:

   ```sql
   insert into public.pharmacy_staff (user_id, pharmacy_id, full_name, role, pc_number, can_approve)
   select id, '11111111-1111-4111-8111-111111111111', 'Akosua Boateng', 'superintendent', '44219', true
   from auth.users where email = 'pharmacist@example.com';
   ```

   Roles: `superintendent`, `pharmacist`, `locum` (may approve with a PC number),
   `counter`, `dispatch` (may never approve).

4. **Run it**: create `.env.local` with the same public values the app uses:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

   then `npm install` and `npm run dev`. On first sign-in, scan the QR code with
   an authenticator app.

## Differences from the Figma design

- **Two-factor uses an authenticator app, not SMS.** Supabase phone MFA is a
  paid add-on; TOTP is free and works without the mobile network.
- **"Trust this device for 30 days"** is not built yet; two-factor is asked on
  every sign-in.
- **Approve/Reject ask to confirm**, and a rejection needs a reason (with
  quick reasons to pick from), because the note goes straight to the patient.
