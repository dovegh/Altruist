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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Delete account',
    heading: 'Delete your Altruist account?',
    intro:
      'This removes your account and everything Altruist holds about you. It cannot be undone after the grace period.',
    deletesTitle: 'What Altruist deletes',
    deletesProfile: 'Your profile, phone number and email',
    deletesAddresses: 'Saved delivery addresses',
    deletesPayment: 'Saved payment methods (tokens held by Paystack are revoked)',
    deletesOrders: 'Order history and wellness activity',
    deletesImages: 'Prescription images stored by Altruist',
    keepsTitle: 'What we cannot delete',
    keepsRecord:
      'Your partner pharmacy keeps its own dispensing record. That is a professional obligation under pharmacy regulation, not an Altruist choice.',
    keepsOrders: '{pharmacy} holds records for orders {order} and {count} others.',
    keepsContact: 'Contact the pharmacy directly to ask about its retention period.',
    keepsFinancial: 'Financial records for completed orders are retained for the statutory period.',
    altTitle: 'Not ready to delete?',
    altLogout: 'Log out on this device instead',
    altNotifications: 'Turn off notifications in Profile',
    altData: 'Delete saved addresses and cards but keep the account',
    continue: 'Continue to delete',
    keep: 'Keep my account',
  },
  fr: {
    title: 'Supprimer le compte',
    heading: 'Supprimer votre compte Altruist ?',
    intro:
      'Cela supprime votre compte et tout ce qu’Altruist détient à votre sujet. Ce sera irréversible après le délai de grâce.',
    deletesTitle: 'Ce qu’Altruist supprime',
    deletesProfile: 'Votre profil, numéro de téléphone et e-mail',
    deletesAddresses: 'Les adresses de livraison enregistrées',
    deletesPayment: 'Les moyens de paiement enregistrés (les jetons détenus par Paystack sont révoqués)',
    deletesOrders: 'L’historique des commandes et l’activité bien-être',
    deletesImages: 'Les images d’ordonnances stockées par Altruist',
    keepsTitle: 'Ce que nous ne pouvons pas supprimer',
    keepsRecord:
      'Votre pharmacie partenaire conserve son propre registre de délivrance. C’est une obligation professionnelle imposée par la réglementation pharmaceutique, pas un choix d’Altruist.',
    keepsOrders: '{pharmacy} détient les registres des commandes {order} et de {count} autres.',
    keepsContact: 'Contactez directement la pharmacie pour connaître sa durée de conservation.',
    keepsFinancial:
      'Les documents financiers des commandes terminées sont conservés pendant la durée légale.',
    altTitle: 'Pas prêt à supprimer ?',
    altLogout: 'Déconnectez-vous plutôt de cet appareil',
    altNotifications: 'Désactivez les notifications dans le Profil',
    altData: 'Supprimez les adresses et cartes enregistrées mais gardez le compte',
    continue: 'Continuer la suppression',
    keep: 'Garder mon compte',
  },
  tw: {
    title: 'Yi wo akontaa',
    heading: 'Yi wo Altruist akontaa?',
    intro:
      'Yei yi wo akontaa ne biribiara a Altruist kora fa wo ho. Sɛ bere a wɔde ama no twam a, wontumi nsan nnya bio.',
    deletesTitle: 'Deɛ Altruist bɛyi',
    deletesProfile: 'Wo ho nsɛm, fon nɔma ne email',
    deletesAddresses: 'Address a woakora',
    deletesPayment: 'Ɛkwan a wode tua ka a woakora (Paystack tokens no nso wɔbɛtwa mu)',
    deletesOrders: 'Nneɛma a woato ho nsɛm ne apɔmuden dwumadie',
    deletesImages: 'Nnuro krataa mfonini a Altruist kora',
    keepsTitle: 'Deɛ yɛntumi nyi',
    keepsRecord:
      'Wo nnuro adetɔnbea hokafoɔ kora nnuro a ɔde ama wo ho nsɛm. Ɛyɛ adwuma mu asɛdeɛ wɔ nnuro mmara ase, ɛnyɛ Altruist apɛdeɛ.',
    keepsOrders: '{pharmacy} kora oda {order} ne afoforɔ {count} ho nsɛm.',
    keepsContact: 'Frɛ nnuro adetɔnbea no tee bisa bere tenten a wɔkora nsɛm.',
    keepsFinancial: 'Yɛkora sika ho nsɛm a ɛfa oda a awie ho kɔsi bere a mmara ahyɛ.',
    altTitle: 'Wonnya nsiesiee sɛ wobɛyi?',
    altLogout: 'Fi mu wɔ fon yi so mmom',
    altNotifications: 'Dum nkaeɛ wɔ Profile mu',
    altData: 'Yi address ne kaad a woakora na gyaw akontaa no',
    continue: 'Kɔ so yi',
    keep: 'Gyaw me akontaa',
  },
  gaa: {
    title: 'Jiemɔ akɔŋt',
    heading: 'Ajie o Altruist akɔŋt lɛ kɛya?',
    intro:
      'Enɛ jieɔ o akɔŋt lɛ kɛ nɔ fɛɛ nɔ ni Altruist hiɛ yɛ o he. Kɛ be ni akɛha lɛ ho lɛ, onyɛŋ oku sɛɛ.',
    deletesTitle: 'Nɔ ni Altruist jieɔ',
    deletesProfile: 'O he saji, tɛlifoŋ nɔmba kɛ email',
    deletesAddresses: 'Address ni otoko',
    deletesPayment: 'Gbɛi ni okɛwoɔ nyɔmɔ ni otoko (Paystack tokens lɛ ajieɔ)',
    deletesOrders: 'Nɔ ni ohe he saji kɛ hewalɛ nitsumɔi',
    deletesImages: 'Tsofa wolo mfonirii ni Altruist toko',
    keepsTitle: 'Nɔ ni wɔnyɛŋ wɔjie',
    keepsRecord:
      'O tsofa shĩa hefatalɔ lɛ hiɛ tsofai ni ekɛha lɛ he saji. Ji nitsumɔ he nɔ ni esa yɛ tsofa mlai shishi, jeee Altruist suɔmɔ.',
    keepsOrders: '{pharmacy} hiɛ nɔ {order} kɛ ekrokomɛi {count} he saji.',
    keepsContact: 'Tsɛ tsofa shĩa lɛ diŋŋ ni obi be ni amɛkɛhiɛɔ saji.',
    keepsFinancial: 'Wɔhiɛɔ shika he saji kɛha nɔ ni agbe naa kɛyashi be ni mlai lɛ tsɔɔ.',
    altTitle: 'Osaaa ohe kɛ ajie?',
    altLogout: 'Jɛ mli yɛ tɛlifoŋ nɛɛ nɔ moŋ',
    altNotifications: 'Gbɔ kaimɔi yɛ Profile mli',
    altData: 'Jie address kɛ kaad ni otoko shi ha akɔŋt lɛ ahi',
    continue: 'Ya nɔ ni ajie',
    keep: 'Ha mi akɔŋt lɛ ahi',
  },
  ee: {
    title: 'Tutu akɔnta',
    heading: 'Àtutu wò Altruist akɔnta?',
    intro:
      'Esia tutua wò akɔnta kple nu siwo katã Altruist lé ɖe asi tso ŋuwò. Womate ŋu agbugbɔe ne ɣeyiɣi si wona la va yi o.',
    deletesTitle: 'Nu siwo Altruist tutuna',
    deletesProfile: 'Wò nyatakakawo, fon xexlẽdzesi kple email',
    deletesAddresses: 'Nudodo ƒe adrɛs siwo nèdzra ɖo',
    deletesPayment: 'Fexexe mɔnu siwo nèdzra ɖo (Paystack ƒe tokenwo hã woatutu)',
    deletesOrders: 'Nudodowo ƒe ŋutinya kple lãmesẽ dɔwɔwɔwo',
    deletesImages: 'Atikeŋɔŋlɔ ƒe foto siwo Altruist dzra ɖo',
    keepsTitle: 'Nu siwo míate ŋu atutu o',
    keepsRecord:
      'Wò atikedzraƒe hati lé atike siwo wòna la ƒe nuŋlɔɖi ɖe asi. Esia nye dɔwɔwɔ ƒe agbanɔamedzi le atikedzraƒe ƒe sewo te, menye Altruist ƒe tiatia o.',
    keepsOrders: '{pharmacy} lé nudodo {order} kple bubu {count} ƒe nuŋlɔɖiwo ɖe asi.',
    keepsContact: 'Ƒo ka na atikedzraƒe la tẽ nàbia ɣeyiɣi si wòléa nuŋlɔɖiwo ɖe asi.',
    keepsFinancial: 'Wolé ga ŋuti nuŋlɔɖi siwo ku ɖe nudodo siwo wu enu ŋu ɖe asi va se ɖe ɣeyiɣi si se ɖo.',
    altTitle: 'Mèle klalo be yeatutui o?',
    altLogout: 'Do go le fon sia dzi boŋ',
    altNotifications: 'Tsi nyanyuiwo le Profile me',
    altData: 'Tutu adrɛs kple kaad siwo nèdzra ɖo gake na akɔnta la nanɔ anyi',
    continue: 'Yi edzi natutui',
    keep: 'Na nye akɔnta nanɔ anyi',
  },
  ha: {
    title: 'Goge asusu',
    heading: 'Goge asusunka na Altruist?',
    intro:
      'Wannan yana goge asusunka da duk abin da Altruist ke riƙe game da kai. Ba za a iya maido shi ba bayan lokacin jinkiri.',
    deletesTitle: 'Abin da Altruist ke gogewa',
    deletesProfile: 'Bayananka, lambar waya da imel',
    deletesAddresses: 'Adireshin kawo kaya da aka ajiye',
    deletesPayment: 'Hanyoyin biya da aka ajiye (za a soke tokens da Paystack ke riƙe)',
    deletesOrders: 'Tarihin oda da ayyukan lafiya',
    deletesImages: 'Hotunan takardun magani da Altruist ke ajiye',
    keepsTitle: 'Abin da ba za mu iya gogewa ba',
    keepsRecord:
      'Kantin magani abokin hulɗarka yana riƙe da nasa rikodin bayar da magani. Wannan wajibi ne na sana’a a ƙarƙashin dokar kantin magani, ba zaɓin Altruist ba.',
    keepsOrders: '{pharmacy} yana riƙe da rikodin oda {order} da wasu {count}.',
    keepsContact: 'Tuntuɓi kantin magani kai tsaye don tambaya game da lokacin ajiyarsa.',
    keepsFinancial: 'Ana ajiye bayanan kuɗi na odar da aka kammala har zuwa lokacin da doka ta tanada.',
    altTitle: 'Ba ka shirya gogewa ba?',
    altLogout: 'Fita a wannan na’ura maimakon haka',
    altNotifications: 'Kashe sanarwa a cikin Profile',
    altData: 'Goge adireshi da katunan da aka ajiye amma ka riƙe asusun',
    continue: 'Ci gaba da gogewa',
    keep: 'Riƙe asusuna',
  },
});

export default function DeleteAccount() {
  const tr = useT(S);
  const pharmacy = usePartnerPharmacy();
  const t = useTokens();
  const { d } = useDesignScale();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title={tr('title')} />

        <View style={{ gap: d(12) }}>
          <FeatureIcon size={72} tone="danger">
            <Icon name="trash" size={d(30)} tone="danger" />
          </FeatureIcon>
          <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
            {tr('heading')}
          </Text>
          <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
            {tr('intro')}
          </Text>
        </View>

        <InfoCard
          icon="check"
          title={tr('deletesTitle')}
          bullets={[
            tr('deletesProfile'),
            tr('deletesAddresses'),
            tr('deletesPayment'),
            tr('deletesOrders'),
            tr('deletesImages'),
          ]}
        />

        <InfoCard
          icon="shield-check"
          title={tr('keepsTitle')}
          tone="warningSubtle"
          bullets={[
            tr('keepsRecord'),
            tr('keepsOrders', { pharmacy: pharmacy.name, order: 'CJ4901TUZ0', count: 3 }),
            tr('keepsContact'),
            tr('keepsFinancial'),
          ]}
        />

        <InfoCard
          icon="info"
          title={tr('altTitle')}
          bullets={[
            tr('altLogout'),
            tr('altNotifications'),
            tr('altData'),
          ]}
        />
      </FormScreen>

      <StickyFooter>
        <Button
          label={tr('continue')}
          variant="danger"
          size="large"
          onPress={() => router.push('/confirm-deletion')}
        />
        <Button
          label={tr('keep')}
          variant="tertiary"
          size="large"
          onPress={() => router.back()}
        />
      </StickyFooter>
    </View>
  );
}
