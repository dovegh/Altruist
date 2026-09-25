/**
 * Edit Profile — ported 1:1 from Figma node 213:366.
 *
 * Scroll content: V gap16, pad 64/24/140/24. A 72pt avatar with a 34pt camera
 * badge, YOUR DETAILS (four fields), then SECURITY (two rows).
 *
 * The phone field is Disabled, not editable in place: the number is the
 * account's recovery channel and the line a pharmacist calls before dispensing,
 * so changing it has to go back through verification. Migration 0009 enforces
 * the same rule in the database — the app cannot write that column.
 *
 * Everything on this screen is now true. Before, the avatar read "AM" for
 * everyone, the date of birth was a hardcoded "14 March 1994", the phone
 * carried a "Verified" badge whether or not anyone had verified it, and "Change
 * photo" opened the PRESCRIPTION uploader — a selfie taken there would have gone
 * to a pharmacist for review. Save wrote to the device only.
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable, AppState } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SectionLabel } from '@/components/ui/Checkout';
import { InputField } from '@/components/ui/Input';
import { IconTile, Toggle } from '@/components/ui/ListRow';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { showDialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { FormMessage, describeFailure } from '@/components/ui/FormMessage';
import {
  authenticate,
  biometricStatus,
  isBiometricEnabled,
  openBiometricSettings,
  setBiometricEnabled,
  type BiometricStatus,
} from '@/lib/appLock';
import { changeEmail, updateProfile } from '@/lib/api';
import {
  dateOfBirthInput,
  initialsOf,
  parseDateOfBirth,
  type ProfilePatch,
} from '@/lib/profile';
import { useProfile, useProfileStore } from '@/features/profile/store';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    enrolTitle: 'Add a fingerprint or face first',
    enrolMessage: 'Set one up in your phone settings, then come back and turn this on.',
    openSettings: 'Open settings',
    notNow: 'Not now',
    bioPrompt: 'Turn on biometric unlock',
    nameRequired: 'Your name is how the pharmacy identifies your order.',
    emailInvalid: 'Enter a valid email address.',
    emailPending: 'Check {email} for a confirmation link. Until then, sign in with {current}.',
    title: 'Edit profile',
    photoA11y: 'Your profile picture',
    avatarA11y: 'Your avatar',
    changePicture: 'Change profile picture',
    changeAvatar: 'Change avatar',
    yourDetails: 'YOUR DETAILS',
    fullName: 'Full name',
    phone: 'Phone number',
    phoneChangeA11y: 'Change your phone number. This re-verifies your account.',
    phoneVerifyA11y: 'Your phone number is not verified. Verify it now.',
    verified: 'Verified',
    notVerified: 'Not verified',
    tapToChange: 'Tap to change',
    tapToVerify: 'Tap to verify',
    email: 'Email address',
    emailConfirm: 'Confirm {email} from your inbox',
    emailHelper: 'Receipts and prescription updates are sent here.',
    dob: 'Date of birth',
    dobFormat: 'DD/MM/YYYY',
    security: 'SECURITY',
    changePassword: 'Change password',
    changePasswordSub: 'Update the password you sign in with',
    biometric: 'Biometric unlock',
    bioReady: 'Use your fingerprint or face to open the app',
    bioNotEnrolled: 'Add a fingerprint or face on your phone first',
    bioUnsupported: 'Not available on this phone',
    save: 'Save changes',
  },
  fr: {
    enrolTitle: "Ajoutez d'abord une empreinte ou un visage",
    enrolMessage: "Configurez-en un dans les réglages du téléphone, puis revenez l'activer ici.",
    openSettings: 'Ouvrir les réglages',
    notNow: 'Plus tard',
    bioPrompt: 'Activer le déverrouillage biométrique',
    nameRequired: "Votre nom permet à la pharmacie d'identifier votre commande.",
    emailInvalid: 'Saisissez une adresse e-mail valide.',
    emailPending: "Consultez {email} pour le lien de confirmation. D'ici là, connectez-vous avec {current}.",
    title: 'Modifier le profil',
    photoA11y: 'Votre photo de profil',
    avatarA11y: 'Votre avatar',
    changePicture: 'Changer la photo de profil',
    changeAvatar: "Changer d'avatar",
    yourDetails: 'VOS INFORMATIONS',
    fullName: 'Nom complet',
    phone: 'Numéro de téléphone',
    phoneChangeA11y: 'Changer votre numéro de téléphone. Votre compte sera vérifié à nouveau.',
    phoneVerifyA11y: "Votre numéro de téléphone n'est pas vérifié. Vérifiez-le maintenant.",
    verified: 'Vérifié',
    notVerified: 'Non vérifié',
    tapToChange: 'Touchez pour changer',
    tapToVerify: 'Touchez pour vérifier',
    email: 'Adresse e-mail',
    emailConfirm: 'Confirmez {email} depuis votre boîte de réception',
    emailHelper: 'Les reçus et les mises à jour des ordonnances sont envoyés ici.',
    dob: 'Date de naissance',
    dobFormat: 'JJ/MM/AAAA',
    security: 'SÉCURITÉ',
    changePassword: 'Changer le mot de passe',
    changePasswordSub: 'Modifiez le mot de passe de connexion',
    biometric: 'Déverrouillage biométrique',
    bioReady: "Utilisez votre empreinte ou votre visage pour ouvrir l'app",
    bioNotEnrolled: "Ajoutez d'abord une empreinte ou un visage sur votre téléphone",
    bioUnsupported: 'Non disponible sur ce téléphone',
    save: 'Enregistrer',
  },
  tw: {
    enrolTitle: 'Fa wo nsateaa anaa w’anim hyɛ mu kane',
    enrolMessage: 'Yɛ no wɔ wo fon nhyehyɛeɛ mu, na san bra bɛbue yei.',
    openSettings: 'Bue nhyehyɛeɛ',
    notNow: 'Ɛnnɛ deɛ, daabi',
    bioPrompt: 'Bue nsateaa anaa anim de bue',
    nameRequired: 'Wo din na nnuro adetɔnbea no de hu wo oda.',
    emailInvalid: 'Kyerɛw email address a ɛyɛ papa.',
    emailPending: 'Hwɛ {email} mu hwehwɛ link a wode bɛsi so pi. Kɔsi saa, fa {current} kɔ mu.',
    title: 'Sesa wo ho nsɛm',
    photoA11y: 'Wo mfonini',
    avatarA11y: 'Wo avatar',
    changePicture: 'Sesa wo mfonini',
    changeAvatar: 'Sesa avatar',
    yourDetails: 'WO HO NSƐM',
    fullName: 'Wo din nyinaa',
    phone: 'Fon nɔma',
    phoneChangeA11y: 'Sesa wo fon nɔma. Ɛbɛma yɛasan asi wo akontaa so pi.',
    phoneVerifyA11y: 'Yɛnsii wo fon nɔma so pi. Si so pi seesei.',
    verified: 'Wɔasi so pi',
    notVerified: 'Wɔnsii so pi',
    tapToChange: 'Mia so na sesa',
    tapToVerify: 'Mia so na si so pi',
    email: 'Email address',
    emailConfirm: 'Si {email} so pi fi wo email mu',
    emailHelper: 'Yɛde ka krataa ne nnuro krataa ho nsɛm to ha.',
    dob: 'Da a wɔwoo wo',
    dobFormat: 'DD/MM/YYYY',
    security: 'AHOBAMMƆ',
    changePassword: 'Sesa password',
    changePasswordSub: 'Sesa password a wode kɔ mu',
    biometric: 'Nsateaa anaa anim de bue',
    bioReady: 'Fa wo nsateaa anaa w’anim bue app no',
    bioNotEnrolled: 'Fa nsateaa anaa anim hyɛ wo fon mu kane',
    bioUnsupported: 'Ɛnni fon yi so',
    save: 'Kora nsakraeɛ no',
  },
  gaa: {
    enrolTitle: 'Kɛ o nine kɛ o hiɛ wo mli klɛŋklɛŋ',
    enrolMessage: 'To lɛ yɛ o tɛlifoŋ toiŋjɔlɛmɔi mli, ni kɛ oba lɛ, bue nɛɛ.',
    openSettings: 'Bue toiŋjɔlɛmɔi',
    notNow: 'Jeee amrɔ nɛɛ',
    bioPrompt: 'Bue nine loo hiɛ kɛ gbele',
    nameRequired: 'O gbɛi ni tsofa shĩa lɛ kɛnaa o nɔ ni ohe lɛ.',
    emailInvalid: 'Ŋma email address ni ja.',
    emailPending: 'Kwɛ {email} mli kɛ link ni okɛaakpɛ nɔ. Kɛyashi nakai, kɛ {current} bo mli.',
    title: 'Tsake o he saji',
    photoA11y: 'O mfoniri',
    avatarA11y: 'O avatar',
    changePicture: 'Tsake o mfoniri',
    changeAvatar: 'Tsake avatar',
    yourDetails: 'O HE SAJI',
    fullName: 'O gbɛi muu',
    phone: 'Tɛlifoŋ nɔmba',
    phoneChangeA11y: 'Tsake o tɛlifoŋ nɔmba. Ekɛ o akɔŋt lɛ baakpɛ nɔ ekoŋŋ.',
    phoneVerifyA11y: 'Akpɛɛɛ o tɛlifoŋ nɔmba lɛ nɔ. Kpɛ nɔ amrɔ nɛɛ.',
    verified: 'Akpɛ nɔ',
    notVerified: 'Akpɛɛɛ nɔ',
    tapToChange: 'Ŋmɛ nɔ koni otsake',
    tapToVerify: 'Ŋmɛ nɔ koni okpɛ nɔ',
    email: 'Email address',
    emailConfirm: 'Kpɛ {email} nɔ kɛjɛ o email mli',
    emailHelper: 'Wɔkɛ nyɔmɔwoo woloi kɛ tsofa wolo he saji maa biɛ.',
    dob: 'Gbi ni afɔ bo',
    dobFormat: 'DD/MM/YYYY',
    security: 'HEBUMƆ',
    changePassword: 'Tsake password',
    changePasswordSub: 'Tsake password ni okɛboɔ mli',
    biometric: 'Nine loo hiɛ kɛ gbele',
    bioReady: 'Kɛ o nine loo o hiɛ gbele app lɛ',
    bioNotEnrolled: 'Kɛ nine loo hiɛ wo o tɛlifoŋ lɛ mli klɛŋklɛŋ',
    bioUnsupported: 'Ebɛ tɛlifoŋ nɛɛ nɔ',
    save: 'To tsakemɔi lɛ',
  },
  ee: {
    enrolTitle: 'Tsɔ asibidɛ alo ŋkume de eme gbã',
    enrolMessage: 'Ɖo ɖeka le wò fon ƒe ɖoɖowo me, emegbe gbugbɔ va ʋu esia.',
    openSettings: 'Ʋu ɖoɖowo',
    notNow: 'Menye fifia o',
    bioPrompt: 'Ʋu asibidɛ alo ŋkume ƒe ʋuʋu',
    nameRequired: 'Wò ŋkɔe atikedzraƒe la zãna tsɔ dzea si wò nudodo.',
    emailInvalid: 'Ŋlɔ email adrɛs si sɔ.',
    emailPending: 'Kpɔ {email} me na link si nàtsɔ aɖo kpe edzi. Hafi, tsɔ {current} ge ɖe eme.',
    title: 'Trɔ wò nyatakakawo',
    photoA11y: 'Wò foto',
    avatarA11y: 'Wò avatar',
    changePicture: 'Trɔ wò foto',
    changeAvatar: 'Trɔ avatar',
    yourDetails: 'WÒ NYATAKAKAWO',
    fullName: 'Wò ŋkɔ bliboa',
    phone: 'Fon xexlẽdzesi',
    phoneChangeA11y: 'Trɔ wò fon xexlẽdzesi. Esia agaɖo kpe wò akɔnta dzi.',
    phoneVerifyA11y: 'Womeɖo kpe wò fon xexlẽdzesi dzi o. Ɖo kpe edzi fifia.',
    verified: 'Woɖo kpe edzi',
    notVerified: 'Womeɖo kpe edzi o',
    tapToChange: 'Ƒoe be nàtrɔe',
    tapToVerify: 'Ƒoe be nàɖo kpe edzi',
    email: 'Email adrɛs',
    emailConfirm: 'Ɖo kpe {email} dzi tso wò email me',
    emailHelper: 'Woɖoa fexexe ŋuɖoɖowo kple atikeŋɔŋlɔ ƒe nyawo ɖe afisia.',
    dob: 'Dzigbe',
    dobFormat: 'DD/MM/YYYY',
    security: 'DEDIENƆNƆ',
    changePassword: 'Trɔ password',
    changePasswordSub: 'Trɔ password si nèzãna tsɔ gena ɖe eme',
    biometric: 'Asibidɛ alo ŋkume ƒe ʋuʋu',
    bioReady: 'Zã wò asibidɛ alo ŋkume tsɔ ʋu app la',
    bioNotEnrolled: 'Tsɔ asibidɛ alo ŋkume de wò fon me gbã',
    bioUnsupported: 'Meli le fon sia dzi o',
    save: 'Dzra tɔtrɔwo ɖo',
  },
  ha: {
    enrolTitle: 'Da farko ƙara zanen yatsa ko fuska',
    enrolMessage: 'Saita ɗaya a saitunan wayarka, sannan ka dawo ka kunna wannan.',
    openSettings: 'Buɗe saituna',
    notNow: 'Ba yanzu ba',
    bioPrompt: 'Kunna buɗewa da zanen yatsa ko fuska',
    nameRequired: 'Da sunanka ne kantin magani ke gane odarka.',
    emailInvalid: 'Shigar da adireshin imel mai inganci.',
    emailPending: 'Duba {email} don hanyar tabbatarwa. Kafin nan, shiga da {current}.',
    title: 'Gyara bayanai',
    photoA11y: 'Hoton bayananka',
    avatarA11y: 'Avatar ɗinka',
    changePicture: 'Canja hoton bayanai',
    changeAvatar: 'Canja avatar',
    yourDetails: 'BAYANANKA',
    fullName: 'Cikakken suna',
    phone: 'Lambar waya',
    phoneChangeA11y: 'Canja lambar wayarka. Wannan zai sake tabbatar da asusunka.',
    phoneVerifyA11y: 'Ba a tabbatar da lambar wayarka ba. Tabbatar da ita yanzu.',
    verified: 'An tabbatar',
    notVerified: 'Ba a tabbatar ba',
    tapToChange: 'Taɓa don canjawa',
    tapToVerify: 'Taɓa don tabbatarwa',
    email: 'Adireshin imel',
    emailConfirm: 'Tabbatar da {email} daga akwatin saƙonka',
    emailHelper: 'Ana aiko rasit da labarin takardun magani nan.',
    dob: 'Ranar haihuwa',
    dobFormat: 'DD/MM/YYYY',
    security: 'TSARO',
    changePassword: 'Canja kalmar sirri',
    changePasswordSub: 'Sabunta kalmar sirrin da kake shiga da ita',
    biometric: 'Buɗewa da zanen yatsa ko fuska',
    bioReady: 'Yi amfani da zanen yatsa ko fuskarka don buɗe app',
    bioNotEnrolled: 'Da farko ƙara zanen yatsa ko fuska a wayarka',
    bioUnsupported: 'Babu shi a wannan waya',
    save: 'Ajiye canje-canje',
  },
});

/** Loose on purpose: the server is the judge; this only catches typos. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditProfile() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();
  const profile = useProfile();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [dob, setDob] = useState(dateOfBirthInput(profile.dateOfBirth));
  const [biometric, setBiometric] = useState(false);
  const [bioStatus, setBioStatus] = useState<BiometricStatus>('ready');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; dob?: string }>({});

  useEffect(() => {
    isBiometricEnabled().then(setBiometric);
    biometricStatus().then(setBioStatus);
    // Check again on return from the phone's settings, where a fingerprint
    // may just have been added.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') biometricStatus().then(setBioStatus);
    });
    return () => sub.remove();
  }, []);

  const toggleBiometric = async (next: boolean) => {
    if (next) {
      if (bioStatus === 'not-enrolled') {
        showDialog({
          icon: 'shield-check',
          title: tr('enrolTitle'),
          message: tr('enrolMessage'),
          actions: [
            { label: tr('openSettings'), onPress: () => void openBiometricSettings() },
            { label: tr('notNow'), variant: 'tertiary' },
          ],
        });
        return;
      }
      // Prove it works before relying on it, or the next lock is a lockout.
      if (!(await authenticate(tr('bioPrompt')))) return;
    }
    setBiometric(next);
    await setBiometricEnabled(next);
  };

  // Illustrations and photo upload both live on Choose Avatar.
  const chooseAvatar = () => router.push('/choose-avatar');

  const save = async () => {
    setError(null);
    setNotice(null);

    // Validate everything before sending anything, so a bad date does not
    // leave a half-saved profile behind.
    const errors: typeof fieldErrors = {};
    const nextName = name.trim();
    if (!nextName) errors.name = tr('nameRequired');

    const nextEmail = email.trim();
    if (!EMAIL.test(nextEmail)) errors.email = tr('emailInvalid');

    let nextDob: string | null | undefined;
    if (dob.trim()) {
      const parsed = parseDateOfBirth(dob);
      if ('error' in parsed) errors.dob = parsed.error;
      else nextDob = parsed.iso;
    } else {
      nextDob = null;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    const patch: ProfilePatch = {};
    if (nextName !== profile.name) patch.name = nextName;
    if ((nextDob ?? undefined) !== profile.dateOfBirth) patch.dateOfBirth = nextDob ?? null;
    const emailChanged = nextEmail.toLowerCase() !== profile.email.toLowerCase();

    if (!Object.keys(patch).length && !emailChanged) {
      router.back();
      return;
    }

    setSaving(true);
    try {
      if (Object.keys(patch).length) {
        const saved = await updateProfile(patch);
        useProfileStore.getState().set(saved);
      }
      if (emailChanged) {
        const outcome = await changeEmail(nextEmail);
        if (outcome === 'pending') {
          // Stay on the screen: the person needs to know the change is not done.
          useProfileStore.getState().set({ pendingEmail: nextEmail });
          setEmail(profile.email);
          setNotice(tr('emailPending', { email: nextEmail, current: profile.email }));
          return;
        }
        useProfileStore.getState().set({ email: nextEmail, pendingEmail: undefined });
      }
      router.back();
    } catch (e) {
      setError(describeFailure(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title={tr('title')} />

        {/* Avatar block */}
        <View style={{ gap: d(12), alignItems: 'flex-start' }}>
          <View style={{ width: d(96), height: d(96) }}>
            <Avatar
              initials={initialsOf(profile.name) || '?'}
              uri={profile.avatarUrl}
              preset={profile.avatarPreset}
              size={72}
              label={profile.avatarUrl ? tr('photoA11y') : tr('avatarA11y')}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('changePicture')}
              onPress={chooseAvatar}
              hitSlop={8}
              style={{
                position: 'absolute',
                left: d(52),
                top: d(52),
                width: d(34),
                height: d(34),
                borderRadius: t.radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.bg.brand,
                borderWidth: 3,
                borderColor: t.colors.bg.canvas,
              }}
            >
              <Icon name="camera" size={d(16)} color={t.colors.icon.onBrand} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('changePicture')}
            hitSlop={8}
            onPress={chooseAvatar}
          >
            <Text variant="labelM" tone="brand" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {tr('changeAvatar')}
            </Text>
          </Pressable>
        </View>

        <SectionLabel>{tr('yourDetails')}</SectionLabel>

        <InputField
          label={tr('fullName')}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          error={fieldErrors.name}
        />

        <View style={{ gap: d(8) }}>
          <InputField label={tr('phone')} value={profile.phone} disabled />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              profile.phoneVerified
                ? tr('phoneChangeA11y')
                : tr('phoneVerifyA11y')
            }
            onPress={() => router.push('/verify')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}
          >
            {profile.phoneVerified ? (
              <Badge label={tr('verified')} tone="success" />
            ) : (
              <Badge label={tr('notVerified')} tone="warning" />
            )}
            <Text
              variant="caption"
              tone="tertiary"
              style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}
            >
              {profile.phoneVerified
                ? tr('tapToChange')
                : tr('tapToVerify')}
            </Text>
          </Pressable>
        </View>

        <InputField
          label={tr('email')}
          helper={
            profile.pendingEmail
              ? tr('emailConfirm', { email: profile.pendingEmail })
              : tr('emailHelper')
          }
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={fieldErrors.email}
        />

        <InputField
          label={tr('dob')}
          helper={tr('dobFormat')}
          placeholder={tr('dobFormat')}
          value={dob}
          onChangeText={setDob}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          error={fieldErrors.dob}
        />

        <SectionLabel>{tr('security')}</SectionLabel>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('changePassword')}
          onPress={() => router.push('/set-password')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(14),
            paddingVertical: d(12),
            paddingLeft: d(14),
            paddingRight: d(16),
            borderRadius: d(18),
            backgroundColor: t.colors.bg.surface,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <IconTile name="shield-check" hue="mint" size={40} />
          <View style={{ flex: 1, gap: d(3) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {tr('changePassword')}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {tr('changePasswordSub')}
            </Text>
          </View>
          <Icon name="chevron-right" size={d(18)} tone="tertiary" />
        </Pressable>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(14),
            paddingVertical: d(12),
            paddingLeft: d(14),
            paddingRight: d(16),
            borderRadius: d(18),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <IconTile name="profile" hue="blue" size={40} />
          <View style={{ flex: 1, gap: d(3) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {tr('biometric')}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {bioStatus === 'ready'
                ? tr('bioReady')
                : bioStatus === 'not-enrolled'
                  ? tr('bioNotEnrolled')
                  : tr('bioUnsupported')}
            </Text>
          </View>
          <Toggle
            value={biometric && bioStatus === 'ready'}
            onValueChange={toggleBiometric}
            disabled={bioStatus === 'unsupported'}
            label={tr('biometric')}
          />
        </View>

        {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}
        {error ? <FormMessage>{error}</FormMessage> : null}
      </FormScreen>

      <StickyFooter>
        <Button
          label={tr('save')}
          size="large"
          loading={saving}
          disabled={saving}
          onPress={save}
        />
      </StickyFooter>
    </View>
  );
}
