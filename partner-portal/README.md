# Altruist Partner Portal

Where a prescription goes after a patient sends it. A pharmacist signs in,
passes two-factor, sees the queue, opens a prescription, and approves or
rejects it. The patient's app updates and they get a notification.

Next.js 16 (App Router), Supabase auth. Designs: Figma *Partner Portal* page
(`MXZvKkbrOrU54cnfPHJF4O`, frames 46:2, 46:100, 147:182, 147:232 …).

## What is built

| Screen | Route | Figma |
| --- | --- | --- |
| Sign in · forgot password · reset password | `/login` `/forgot-password` `/reset-password` | 147:182 |
| Two-factor (authenticator app) | `/two-factor` | 147:232 |
| Accept a staff invite | `/join` | — |
| Dashboard | `/dashboard` | 149:207 |
| Incoming orders · order detail | `/orders` `/orders/[id]` | 46:2 · 87:60 |
| Prescription queue · review | `/prescriptions` `/prescriptions/[id]` | 46:100 |
| Fulfilment board | `/fulfilment` | 75:41 |
| Refunds · refund decision | `/refunds` `/refunds/[id]` | 105:104 |
| Inventory | `/inventory` | 149:410 |
| Payouts (+ CSV statement per week) | `/payouts` | 150:326 |
| Staff (invite, roles, approval rights) | `/staff` | 150:659 |
| Settings & licence | `/settings` | 150:510 |

Who may do what (enforced in the database, migrations 0018–0021):

| | Any staff | Registered pharmacist (`can_approve`) | Superintendent |
| --- | --- | --- | --- |
| See everything, move orders on the board, update stock | ✓ | ✓ | ✓ |
| Approve / reject prescriptions, decide refunds, change prices | | ✓ | ✓ (with a PC number) |
| Invite and manage staff, edit pharmacy settings, upload licence | | | ✓ |

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

1. **Apply the migrations** `supabase/migrations/0018` to `0021`
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

4. **Allow the portal's email links**: Supabase dashboard → Authentication →
   URL Configuration → Redirect URLs → add `http://localhost:3100/auth/callback`
   (and the live portal's `/auth/callback` when it is deployed). Password reset
   and staff invites need it.

5. **Run it**: create `.env.local` with the same public values the app uses:

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
