/**
 * Delete Account — ported 1:1 from Figma node 91:201.
 *
 * Scroll content: V gap16, pad 64/24/140/24. A coral feature circle and head,
 * then three cards — what Altruist deletes, what it cannot, and alternatives.
 * Footer: Danger "Continue to delete" over Tertiary "Keep my account".
 *
 * The gold "what we cannot delete" card is the honest half of this screen and
 * the reason it is not a one-tap destructive action. Altruist is a technology
 * bridge: the dispensing pharmacy holds its own record under pharmacy
 * regulation, and no amount of deleting on our side changes that. Saying so
 * before the user commits is the difference between a deletion flow and a
 * promise we cannot keep.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter, FeatureIcon } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { InfoCard } from '@/components/ui/InfoList';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { usePartnerPharmacy } from '@/features/profile/store';

export default function DeleteAccount() {
  const pharmacy = usePartnerPharmacy();
  const t = useTokens();
  const { d } = useDesignScale();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title="Delete account" />

        <View style={{ gap: d(12) }}>
          <FeatureIcon size={72} tone="danger">
            <Icon name="trash" size={d(30)} tone="danger" />
          </FeatureIcon>
          <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
            Delete your Altruist account?
          </Text>
          <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
            This removes your account and everything Altruist holds about you. It cannot be undone
            after the grace period.
          </Text>
        </View>

        <InfoCard
          icon="check"
          title="What Altruist deletes"
          bullets={[
            'Your profile, phone number and email',
            'Saved delivery addresses',
            'Saved payment methods (tokens held by Paystack are revoked)',
            'Order history and wellness activity',
            'Prescription images stored by Altruist',
          ]}
        />

        <InfoCard
          icon="shield-check"
          title="What we cannot delete"
          tone="warningSubtle"
          bullets={[
            'Your partner pharmacy keeps its own dispensing record. That is a professional obligation under pharmacy regulation, not an Altruist choice.',
            `${pharmacy.name} holds records for orders CJ4901TUZ0 and 3 others.`,
            'Contact the pharmacy directly to ask about its retention period.',
            'Financial records for completed orders are retained for the statutory period.',
          ]}
        />

        <InfoCard
          icon="info"
          title="Not ready to delete?"
          bullets={[
            'Log out on this device instead',
            'Turn off notifications in Profile',
            'Delete saved addresses and cards but keep the account',
          ]}
        />
      </FormScreen>

      <StickyFooter>
        <Button
          label="Continue to delete"
          variant="danger"
          size="large"
          onPress={() => router.push('/confirm-deletion')}
        />
        <Button
          label="Keep my account"
          variant="tertiary"
          size="large"
          onPress={() => router.back()}
        />
      </StickyFooter>
    </View>
  );
}
