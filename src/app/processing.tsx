/**
 * Loading — Processing — ported 1:1 from Figma node on page "System States".
 *
 * V gap24, pad 250/24/40/24. A 96pt spinner (8pt track, brand arc), a 24pt
 * head, then a tertiary Cancel.
 *
 * The body names what is happening to the file — encrypting and routing — not
 * just "please wait". A user handing over a photo of their prescription is
 * entitled to know it is being encrypted before it leaves the phone.
 *
 * This screen owns the upload call and every one of its outcomes: it records the
 * accepted script and resolves to the prescriptions list; a failure stays here,
 * says what went wrong and offers to try again. It used to send every failure
 * to the rejection screen — a failed upload read as a pharmacist turning the
 * prescription down, with a note nobody wrote. Recording happens here, not on
 * the upload screen, because the record has to carry the TrxID the server
 * minted — writing it before the call would leave a phantom script behind.
 */
import React, { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusScreen, Spinner } from '@/components/ui/StatusScreen';
import { Button } from '@/components/ui/Button';
import { uploadPrescription } from '@/lib/api';
import { describeFailure } from '@/components/ui/FormMessage';
import { usePrescriptionStore, simulateReview } from '@/features/prescriptions/store';
import { usePartnerPharmacy } from '@/features/profile/store';

export default function Processing() {
  const pharmacy = usePartnerPharmacy();
  const cancelled = useRef(false);
  const { uri, for: forParam } = useLocalSearchParams<{ uri?: string; for?: string }>();
  const record = usePrescriptionStore((s) => s.record);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    cancelled.current = false;
    const productIds = (forParam ?? '').split(',').filter(Boolean);

    uploadPrescription(uri || undefined, productIds)
      .then((accepted) => {
        if (cancelled.current) return;
        record({ id: accepted.trxId, pharmacy: accepted.pharmacy, productIds });
        // Fixture-only: stands in for the pharmacist so PENDING can become
        // VERIFIED and the gated path through checkout is reachable. No-ops
        // against a real gateway.
        simulateReview(accepted.trxId);
        router.replace('/prescriptions');
      })
      .catch((error) => {
        if (cancelled.current) return;
        console.warn('uploadPrescription failed', error);
        setFailure(describeFailure(error));
      });
    return () => {
      cancelled.current = true;
    };
  }, [uri, forParam, record, attempt]);

  if (failure) {
    return (
      <StatusScreen
        icon="danger"
        tone="danger"
        gap={24}
        paddingTop={200}
        titleSize={24}
        title="Not sent"
        body={`${failure} Your prescription has not reached the pharmacy.`}
        actions={
          <>
            <Button
              label="Try again"
              size="large"
              onPress={() => {
                setFailure(null);
                setAttempt((n) => n + 1);
              }}
            />
            <Button
              label="Cancel"
              variant="tertiary"
              size="large"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/prescriptions'))}
            />
          </>
        }
      />
    );
  }

  return (
    <StatusScreen
      hero={<Spinner size={96} />}
      gap={24}
      paddingTop={250}
      titleSize={24}
      title="Sending to the pharmacy"
      body={`Sending your prescription to ${pharmacy.name}.`}
      actions={
        <Button
          label="Cancel"
          variant="tertiary"
          size="medium"
          fullWidth={false}
          style={{ alignSelf: 'center' }}
          onPress={() => {
            cancelled.current = true;
            router.back();
          }}
        />
      }
    />
  );
}
