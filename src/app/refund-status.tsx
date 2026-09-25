/**
 * Refund Status — ported 1:1 from Figma node 104:120.
 *
 * Scroll content: V gap16, pad 64/24/120/24. A case hero (r28, pad 20), the
 * four-step case timeline, the requested items with evidence thumbs, then the
 * "if declined" note. Footer: Contact the pharmacy + Withdraw this request.
 *
 * "Withdraw" is tertiary, not danger. Withdrawing your own open request is not
 * destructive — nothing is lost and it can be raised again — and colouring it
 * red would make a reversible action look like a final one.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SectionLabel } from '@/components/ui/Checkout';
import { Badge } from '@/components/ui/Badge';
import { cedis } from '@/lib/money';
import { useOrderStore } from '@/features/orders/store';
import { Button, ButtonRow } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { usePartnerPharmacy } from '@/features/profile/store';
import { refundCaseSteps } from '@/lib/forms';
import { defineStrings, useLocale, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Refund request',
    requested: 'Requested refund',
    underReview: 'Under review',
    caseLine: 'Case {ref} · raised {at}',
    whatReturn: 'WHAT YOU ASKED TO RETURN',
    returnedItems: 'Returned items',
    damaged: 'Damaged on arrival · 2 photos',
    evidencePhoto: 'Evidence photo {n}',
    declineTitle: 'If the pharmacy declines',
    declineBody:
      'You will see their written reason here and can reply or escalate to Altruist support. Nothing is charged for raising a request.',
    contact: 'Contact the pharmacy',
    withdrawQ: 'Withdraw case {ref}? The pharmacy stops reviewing it.',
    yesWithdraw: 'Yes, withdraw',
    keepOpen: 'Keep it open',
    withdraw: 'Withdraw this request',
  },
  fr: {
    title: 'Demande de remboursement',
    requested: 'Remboursement demandé',
    underReview: 'En cours d’examen',
    caseLine: 'Dossier {ref} · ouvert le {at}',
    whatReturn: 'CE QUE VOUS AVEZ DEMANDÉ À RETOURNER',
    returnedItems: 'Articles retournés',
    damaged: 'Endommagé à la réception · 2 photos',
    evidencePhoto: 'Photo justificative {n}',
    declineTitle: 'Si la pharmacie refuse',
    declineBody:
      'Vous verrez ici son motif écrit et pourrez répondre ou faire appel au support Altruist. Ouvrir une demande est gratuit.',
    contact: 'Contacter la pharmacie',
    withdrawQ: 'Retirer le dossier {ref} ? La pharmacie cessera de l’examiner.',
    yesWithdraw: 'Oui, retirer',
    keepOpen: 'Le garder ouvert',
    withdraw: 'Retirer cette demande',
  },
  tw: {
    title: 'Sika sane abisadeɛ',
    requested: 'Sika a wobisaeɛ',
    underReview: 'Wɔrehwɛ mu',
    caseLine: 'Asɛm {ref} · wobisaa no {at}',
    whatReturn: 'DEƐ WOPƐ SƐ WODE SAN',
    returnedItems: 'Nneɛma a wode resan',
    damaged: 'Ɛsɛeeɛ ansa na ɛreba · mfonini 2',
    evidencePhoto: 'Adanseɛ mfonini {n}',
    declineTitle: 'Sɛ nnuro fie no po a',
    declineBody:
      'Wobɛhunu deɛ enti a wɔpoeɛ wɔ ha na wobɛtumi abua anaa de akɔ Altruist support. Wontua hwee sɛ wobisa a.',
    contact: 'Frɛ nnuro fie no',
    withdrawQ: 'Yi asɛm {ref} firi hɔ? Nnuro fie no rennhwɛ mu bio.',
    yesWithdraw: 'Aane, yi firi hɔ',
    keepOpen: 'Ma ɛntena hɔ',
    withdraw: 'Yi saa abisadeɛ yi firi hɔ',
  },
  gaa: {
    title: 'Shika nibimɔ',
    requested: 'Shika ni obi',
    underReview: 'Akwɛɔ mli',
    caseLine: 'Sane {ref} · obi yɛ {at}',
    whatReturn: 'NƆ NI OBI AKƐ OAAKU',
    returnedItems: 'Nibii ni okuɔ',
    damaged: 'Efite dani eba · mfonirii 2',
    evidencePhoto: 'Odasefeemɔ mfoniri {n}',
    declineTitle: 'Kɛji tsofa shĩa lɛ kpoo',
    declineBody:
      'Obaana nɔ hewɔ ni amɛkpoo yɛ biɛ ni obaanyɛ ohã hetoo loo okɛya Altruist support. Owooo nɔ ko kɛji obi.',
    contact: 'Tsɛ tsofa shĩa lɛ',
    withdrawQ: 'Jiemɔ sane {ref}? Tsofa shĩa lɛ kɛ kwɛmɔ lɛ baaŋmɛɛ.',
    yesWithdraw: 'Hɛɛ, jiemɔ',
    keepOpen: 'Ha ehi jɛmɛ',
    withdraw: 'Jiemɔ nibimɔ nɛɛ',
  },
  ee: {
    title: 'Ga gbugbɔ ƒe biabia',
    requested: 'Ga si nèbia',
    underReview: 'Wole ekpɔm',
    caseLine: 'Nya {ref} · nèbiae {at}',
    whatReturn: 'NU SI NÈBIA BE YEATRƆ',
    returnedItems: 'Nu siwo nètrɔ',
    damaged: 'Egblẽ hafi va ɖo · foto 2',
    evidencePhoto: 'Kpeɖodzi foto {n}',
    declineTitle: 'Ne atikeƒle la gbe',
    declineBody:
      'Àkpɔ susu si ŋlɔm wogbee ɖo le afii eye àte ŋu aɖo eŋu alo atsɔe ayi Altruist support. Womexea fe ɖe biabia ŋu o.',
    contact: 'Yɔ atikeƒle la',
    withdrawQ: 'Ɖe nya {ref} ɖa? Atikeƒle la madzɔ ekpɔm o.',
    yesWithdraw: 'Ẽ, ɖee ɖa',
    keepOpen: 'Na wòanɔ anyi',
    withdraw: 'Ɖe biabia sia ɖa',
  },
  ha: {
    title: 'Buƙatar mayar da kuɗi',
    requested: 'Kuɗin da aka nema',
    underReview: 'Ana dubawa',
    caseLine: 'Ƙara {ref} · an buɗe {at}',
    whatReturn: 'ABIN DA KA NEMI MAYARWA',
    returnedItems: 'Kayan da aka mayar',
    damaged: 'Ya lalace kafin isowa · hotuna 2',
    evidencePhoto: 'Hoton shaida {n}',
    declineTitle: 'Idan kantin magani ya ƙi',
    declineBody:
      'Za ka ga rubutaccen dalilinsu a nan kuma za ka iya amsawa ko ka kai ga tallafin Altruist. Ba a biyan komai don neman buƙata.',
    contact: 'Tuntuɓi kantin magani',
    withdrawQ: 'Janye ƙara {ref}? Kantin magani zai daina dubawa.',
    yesWithdraw: 'Eh, janye',
    keepOpen: 'Bar ta a buɗe',
    withdraw: 'Janye wannan buƙata',
  },
});

type StepState = 'done' | 'current' | 'upcoming';


export default function RefundStatus() {
  const tr = useT(S);
  const locale = useLocale();
  const t = useTokens();
  const { d } = useDesignScale();
  const pharmacy = usePartnerPharmacy();
  const [withdrawing, setWithdrawing] = useState(false);
  const { id, amount } = useLocalSearchParams<{ id?: string; amount?: string }>();

  const order = useOrderStore((s) => s.items.find((o) => o.id === (id ?? s.lastOrderId)));
  const refund = Number(amount ?? 0);
  // The case reference is derived from the order so support can find it, rather
  // than being a number nothing else in the system knows about.
  const caseRef = order ? `RF-${order.id.slice(2, 6)}` : 'RF-0000';
  // One value, shown in the hero and quoted in the first timeline step — they
  // are the same event and must not drift by a render.
  const raisedAt = new Date().toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const STEPS = refundCaseSteps(pharmacy.name, raisedAt);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16} contentStyle={{ paddingBottom: d(120) }}>
        <TitleAppBar title={tr('title')} />

        {/* Case hero */}
        <View
          style={{
            gap: d(10),
            padding: d(20),
            borderRadius: d(28),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
            <Text
              variant="caption"
              tone="tertiary"
              style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}
            >
              {tr('requested')}
            </Text>
            <Badge label={tr('underReview')} tone="warning" />
          </View>
          <Text variant="numericL" style={{ fontSize: d(28), lineHeight: d(32) }}>
            {cedis(refund)}
          </Text>
          <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            {tr('caseLine', { ref: caseRef, at: raisedAt })}
          </Text>
        </View>

        {/* Case timeline */}
        <View
          style={{
            padding: d(18),
            borderRadius: d(24),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          {STEPS.map((s, i) => {
            const last = i === STEPS.length - 1;
            return (
              <View
                key={s.title}
                accessibilityRole="text"
                accessibilityLabel={`${s.title}. ${s.meta}. ${s.state}`}
                style={{ flexDirection: 'row', gap: d(14) }}
              >
                <View style={{ width: d(26), alignItems: 'center' }}>
                  <View
                    style={{
                      width: d(26),
                      height: d(26),
                      borderRadius: t.radius.full,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor:
                        s.state === 'done'
                          ? t.colors.bg.brand
                          : s.state === 'current'
                            ? t.colors.bg.warningSubtle
                            : t.colors.bg.surfaceRaised,
                    }}
                  >
                    {s.state === 'done' ? (
                      <Icon name="check" size={d(14)} color={t.colors.icon.onBrand} />
                    ) : s.state === 'current' ? (
                      <Icon name="clock" size={d(14)} tone="warning" />
                    ) : null}
                  </View>
                  {!last ? (
                    <View
                      style={{
                        flex: 1,
                        width: d(2),
                        minHeight: d(30),
                        borderRadius: d(2),
                        backgroundColor:
                          s.state === 'done' ? t.colors.border.brand : t.colors.border.subtle,
                      }}
                    />
                  ) : null}
                </View>

                <View style={{ flex: 1, gap: d(3), paddingBottom: last ? 0 : d(14) }}>
                  <Text
                    variant="labelM"
                    tone={s.state === 'upcoming' ? 'tertiary' : 'primary'}
                    style={{ fontSize: d(14), lineHeight: d(18) }}
                  >
                    {s.title}
                  </Text>
                  <Text
                    variant="caption"
                    tone="tertiary"
                    style={{ fontSize: d(12), lineHeight: d(16) }}
                  >
                    {s.meta}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Requested items */}
        <View
          style={{
            gap: d(12),
            paddingVertical: d(16),
            paddingHorizontal: d(18),
            borderRadius: d(24),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <SectionLabel>{tr('whatReturn')}</SectionLabel>

          <View style={{ flexDirection: 'row', gap: d(12) }}>
            <View style={{ flex: 1, gap: d(3) }}>
              <Text variant="labelM" numberOfLines={2} style={{ fontSize: d(14), lineHeight: d(18) }}>
                {order?.lines.filter((l) => !l.requiresPrescription).map((l) => `${l.name} × ${l.qty}`).join(', ') ??
                  tr('returnedItems')}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {tr('damaged')}
              </Text>
            </View>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {cedis(refund)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: d(8) }}>
            {[1, 2].map((p) => (
              <View
                key={p}
                accessibilityRole="image"
                accessibilityLabel={tr('evidencePhoto', { n: p })}
                style={{
                  width: d(56),
                  height: d(56),
                  borderRadius: d(14),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.colors.bg.surfaceRaised,
                }}
              >
                <Icon name="image" size={d(20)} tone="tertiary" />
              </View>
            ))}
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: d(12),
            paddingVertical: d(14),
            paddingHorizontal: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.surfaceRaised,
          }}
        >
          <Icon name="info" size={d(20)} tone="primary" />
          <View style={{ flex: 1, gap: d(4) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {tr('declineTitle')}
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {tr('declineBody')}
            </Text>
          </View>
        </View>
      </FormScreen>

      <StickyFooter>
        <Button
          label={tr('contact')}
          variant="secondary"
          size="large"
          iconLeading="call"
          onPress={() => router.push('/support')}
        />
        {withdrawing ? (
          <View style={{ gap: d(10) }}>
            <Text variant="labelM" tone="danger" center style={{ fontSize: d(14), lineHeight: d(18) }}>
              {tr('withdrawQ', { ref: caseRef })}
            </Text>
            <ButtonRow>
              <Button
                label={tr('yesWithdraw')}
                variant="danger"
                size="medium"
                style={{ flex: 1 }}
                // Nothing has been refunded yet, so withdrawing is local: the
                // case simply stops being open and the order stands as it was.
                onPress={() => router.replace('/order-history')}
              />
              <Button
                label={tr('keepOpen')}
                variant="tertiary"
                size="medium"
                style={{ flex: 1 }}
                onPress={() => setWithdrawing(false)}
              />
            </ButtonRow>
          </View>
        ) : (
          <Button
            label={tr('withdraw')}
            variant="tertiary"
            size="medium"
            onPress={() => setWithdrawing(true)}
          />
        )}
      </StickyFooter>
    </View>
  );
}
