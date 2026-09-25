/**
 * Deletion Scheduled — ported 1:1 from Figma node 91:350.
 *
 * Scroll content: V gap20, pad 150/24/60/24. A 132pt gold clock circle, a
 * centred head naming the exact date, a grace-period card of three fact rows,
 * then the cancel/done pair.
 *
 * Gold, not coral: nothing has been destroyed yet. The screen's job is to make
 * the 30-day window feel like a window, and the primary action is the one that
 * reverses the decision — the destructive path is already behind the user.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, FeatureIcon } from '@/components/ui/FormScreen';
import { FactRow } from '@/components/ui/InfoList';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { endSession } from '@/features/account/session';
import { useProfile, usePartnerPharmacy } from '@/features/profile/store';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    heading: 'Scheduled for deletion',
    body: 'Your account will be permanently deleted on 22 September 2026.',
    graceTitle: 'You have 30 days',
    graceBody: 'Sign in any time before 22 Sept to cancel and keep everything.',
    signedOutTitle: 'You are signed out everywhere',
    signedOutBody: 'All sessions on all devices have ended.',
    pharmacyTitle: 'Pharmacy records are unaffected',
    pharmacyBody: '{pharmacy} keeps its dispensing record under its own obligations.',
    cancel: 'Cancel deletion, keep my account',
    done: 'Done',
    sent: 'A confirmation has been sent to {email}.',
  },
  fr: {
    heading: 'Suppression programmée',
    body: 'Votre compte sera définitivement supprimé le 22 septembre 2026.',
    graceTitle: 'Vous avez 30 jours',
    graceBody: 'Connectez-vous avant le 22 sept. pour annuler et tout conserver.',
    signedOutTitle: 'Vous êtes déconnecté partout',
    signedOutBody: 'Toutes les sessions sur tous les appareils ont été fermées.',
    pharmacyTitle: 'Les registres de la pharmacie ne sont pas concernés',
    pharmacyBody: '{pharmacy} conserve son registre de délivrance selon ses propres obligations.',
    cancel: 'Annuler la suppression et garder mon compte',
    done: 'Terminé',
    sent: 'Une confirmation a été envoyée à {email}.',
  },
  tw: {
    heading: 'Wɔahyɛ da sɛ wɔbɛyi',
    body: 'Wɔbɛyi wo akontaa afebɔɔ wɔ September 22, 2026.',
    graceTitle: 'Wowɔ nna 30',
    graceBody: 'Kɔ mu bere biara ansa na September 22 aduru na twa mu na kora biribiara.',
    signedOutTitle: 'Woafi mu wɔ baabiara',
    signedOutBody: 'Wɔato wo mu wɔ fon ne kɔmputa nyinaa so.',
    pharmacyTitle: 'Ɛnka nnuro adetɔnbea nsɛm',
    pharmacyBody: '{pharmacy} kora nnuro a ɔde ama ho nsɛm sɛdeɛ n’asɛdeɛ te.',
    cancel: 'Twa yiye no mu, gyaw me akontaa',
    done: 'Awie',
    sent: 'Yɛde nkra a ɛsi so pi akɔ {email}.',
  },
  gaa: {
    heading: 'Ato gbi ni ajieɔ',
    body: 'Abaajie o akɔŋt lɛ kɛya daa yɛ September 22, 2026.',
    graceTitle: 'Oyɛ gbii 30',
    graceBody: 'Bo mli be fɛɛ be dani September 22 ashɛ koni okpa ni oto nɔ fɛɛ nɔ.',
    signedOutTitle: 'Ojɛ mli yɛ he fɛɛ he',
    signedOutBody: 'Aŋmɛ o mli yɛ tɛlifoŋ kɛ kɔmputa fɛɛ nɔ.',
    pharmacyTitle: 'Etaaa tsofa shĩa saji lɛ',
    pharmacyBody: '{pharmacy} hiɛɔ tsofai ni ekɛha lɛ he saji yɛ ediŋŋ ehe nitsumɔ naa.',
    cancel: 'Kpa jiemɔ lɛ, ha mi akɔŋt lɛ ahi',
    done: 'Egbe naa',
    sent: 'Wɔtsu kpɛmɔ he sane kɛya {email}.',
  },
  ee: {
    heading: 'Woɖo ŋkeke si woatutui',
    body: 'Woatutu wò akɔnta tegbee le September 22, 2026 dzi.',
    graceTitle: 'Ŋkeke 30 le asiwò',
    graceBody: 'Ge ɖe eme ɣesiaɣi hafi September 22 naɖo be nàɖe asi le eŋu eye nàlé nuwo katã ɖe asi.',
    signedOutTitle: 'Èdo go le afisiafi',
    signedOutBody: 'Wotu wò akɔnta le mɔ̃wo katã dzi.',
    pharmacyTitle: 'Atikedzraƒe ƒe nuŋlɔɖiwo mele eme o',
    pharmacyBody: '{pharmacy} lé atike siwo wòna ƒe nuŋlɔɖi ɖe asi le eya ŋutɔ ƒe agbanɔamedziwo nu.',
    cancel: 'Ɖe asi le tutu ŋu, na nye akɔnta nanɔ anyi',
    done: 'Ewu enu',
    sent: 'Míeɖo kpeɖodzinya ɖe {email}.',
  },
  ha: {
    heading: 'An tsara gogewa',
    body: 'Za a goge asusunka har abada a ranar 22 ga Satumba 2026.',
    graceTitle: 'Kana da kwana 30',
    graceBody: 'Shiga kowane lokaci kafin 22 ga Satumba don sokewa da riƙe komai.',
    signedOutTitle: 'An fitar da kai a ko’ina',
    signedOutBody: 'Duk zaman shiga a duk na’urori sun ƙare.',
    pharmacyTitle: 'Rikodin kantin magani ba ya shafa',
    pharmacyBody: '{pharmacy} yana riƙe da rikodin bayar da magani ƙarƙashin nasa wajibai.',
    cancel: 'Soke gogewa, riƙe asusuna',
    done: 'An gama',
    sent: 'An aika tabbaci zuwa {email}.',
  },
});

export default function DeletionScheduled() {
  const tr = useT(S);
  const profile = useProfile();
  const pharmacy = usePartnerPharmacy();
  const t = useTokens();
  const { d } = useDesignScale();

  const done = async () => {
    // Everywhere, not just this phone: an account scheduled for deletion must
    // not stay signed in on another device for the grace period.
    await endSession({ everywhere: true });
    router.replace('/welcome');
  };

  return (
    <FormScreen gap={20} contentStyle={{ paddingTop: d(150), paddingBottom: d(60) }}>
      <View style={{ alignItems: 'center' }}>
        <FeatureIcon size={132} tone="warning">
          <Icon name="clock" size={d(54)} tone="warning" />
        </FeatureIcon>
      </View>

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" center style={{ fontSize: d(28), lineHeight: d(32) }}>
          {tr('heading')}
        </Text>
        <Text
          variant="bodyL"
          tone="secondary"
          center
          style={{ fontSize: d(16), lineHeight: d(24) }}
        >
          {tr('body')}
        </Text>
      </View>

      <View
        style={{
          gap: d(12),
          paddingVertical: d(16),
          paddingHorizontal: d(18),
          borderRadius: d(24),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <FactRow
          icon="clock"
          title={tr('graceTitle')}
          body={tr('graceBody')}
        />
        <FactRow
          icon="logout"
          title={tr('signedOutTitle')}
          body={tr('signedOutBody')}
        />
        <FactRow
          icon="shield-check"
          title={tr('pharmacyTitle')}
          body={tr('pharmacyBody', { pharmacy: pharmacy.name })}
        />
      </View>

      <Button
        label={tr('cancel')}
        size="large"
        onPress={() => router.replace('/profile')}
      />
      <Button label={tr('done')} variant="tertiary" size="large" onPress={done} />

      <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
        {tr('sent', { email: profile.email })}
      </Text>
    </FormScreen>
  );
}
