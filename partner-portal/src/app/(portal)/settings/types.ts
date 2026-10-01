/** What `portal_settings()` (0021) returns. */
export type LicenceSubmissionStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';

export type PharmacySettings = {
  name: string;
  licence_number: string;
  /** 'YYYY-MM-DD' */
  licence_expires_on: string | null;
  days_left: number | null;
  address: string | null;
  phone: string | null;
  accepting_orders: boolean;
  opening_hours: string | null;
  delivery_radius_km: number | null;
  superintendent: { name: string; pc_number: string | null } | null;
  latest_licence: {
    status: LicenceSubmissionStatus;
    submitted_at: string;
    expires_on: string;
  } | null;
  can_manage: boolean;
};

/** The editable part, as the form holds it. */
export type PharmacyUpdate = {
  address: string;
  phone: string;
  opening_hours: string;
  delivery_radius_km: number | null;
  accepting_orders: boolean;
};
