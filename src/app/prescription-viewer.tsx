/**
 * Prescription Image Viewer — ported from Figma node 83:376.
 *
 * Canvas is bg/surface-sunken, not bg/canvas: the viewer is a lightbox, and the
 * darker plane is what makes the page read as a lit document.
 *
 * Everything on it comes from the prescription record:
 *   - the photo is the real upload, fetched through a short-lived signed link
 *     from the private bucket (or the local file, straight after uploading);
 *   - pinch, drag and double-tap zoom it, and the pill does the same by steps;
 *   - the status, reviewer, date and — on a rejection — the pharmacist's
 *     reason are the pharmacy's own words from the server;
 *   - Export hands the actual file to the share sheet;
 *   - Re-upload appears only on a rejection, and covers the same items.
 *
 * It used to show a drawn mock page whenever it was opened from the list, a
 * hardcoded "1 of 1 page", and an access panel stating things nobody had
 * checked ("Stored encrypted (AES-256)", "No other access").
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { showDialog } from '@/components/ui/Dialog';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/PrescriptionCard';
import { FormMessage } from '@/components/ui/FormMessage';
import { loadPrescriptions, usePrescriptionStore } from '@/features/prescriptions/store';
import { useProducts } from '@/features/catalog/queries';
import { prescriptionImageUrl } from '@/lib/api';
import { SUPABASE_CONFIGURED } from '@/lib/supabase';
import { leaveAppFor } from '@/lib/appLock';
import { defineStrings, useLocale, useT } from '@/i18n';

// The rejection reason is the pharmacist's own words and never goes through `tr`.
const S = defineStrings({
  en: {
    prescriptionId: 'Prescription {id}',
    quoteId: 'Quote this ID if you contact the pharmacy.',
    copyId: 'Copy ID',
    close: 'Close',
    noSharing: 'Sharing is not available on this phone.',
    exportFailed: 'Could not export the photo. Try again.',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    tryAgain: 'Try again',
    photoA11y: 'Your uploaded prescription',
    loadFailed: 'Could not load the photo.',
    noPhoto: 'No photo attached.',
    closeViewer: 'Close viewer',
    notFound: 'This prescription could not be found.',
    verifiedBy: 'Verified by {name}',
    rejectedBy: 'Rejected by {name}',
    beingReviewed: 'Being reviewed',
    waiting: 'Waiting for a pharmacist',
    prescription: 'Prescription',
    idCopied: 'ID copied',
    idLine: 'ID {id}',
    moreOptions: 'More options',
    coversMany: '{name} · {count} items',
    uploaded: 'Uploaded {when}',
    reason: 'Reason',
    review: 'REVIEW',
    private: 'Private',
    privateMeta: 'Only you and {pharmacy} can see it',
    export: 'Export',
    reupload: 'Re-upload',
  },
  fr: {
    prescriptionId: 'Ordonnance {id}',
    quoteId: 'Indiquez cet identifiant si vous contactez la pharmacie.',
    copyId: "Copier l'identifiant",
    close: 'Fermer',
    noSharing: "Le partage n'est pas disponible sur ce téléphone.",
    exportFailed: "Impossible d'exporter la photo. Réessayez.",
    zoomOut: 'Dézoomer',
    zoomIn: 'Zoomer',
    tryAgain: 'Réessayer',
    photoA11y: 'Votre ordonnance envoyée',
    loadFailed: 'Impossible de charger la photo.',
    noPhoto: 'Aucune photo jointe.',
    closeViewer: 'Fermer la visionneuse',
    notFound: 'Cette ordonnance est introuvable.',
    verifiedBy: 'Vérifiée par {name}',
    rejectedBy: 'Refusée par {name}',
    beingReviewed: "En cours d'examen",
    waiting: "En attente d'un pharmacien",
    prescription: 'Ordonnance',
    idCopied: 'Identifiant copié',
    idLine: 'ID {id}',
    moreOptions: "Plus d'options",
    coversMany: '{name} · {count} articles',
    uploaded: 'Envoyée le {when}',
    reason: 'Motif',
    review: 'EXAMEN',
    private: 'Privée',
    privateMeta: 'Seuls vous et {pharmacy} pouvez la voir',
    export: 'Exporter',
    reupload: 'Renvoyer',
  },
  tw: {
    prescriptionId: 'Nnuro krataa {id}',
    quoteId: 'Ka ID yi kyerɛ nnuro adetɔnbea no sɛ wofrɛ wɔn a.',
    copyId: 'Kɔpi ID no',
    close: 'To mu',
    noSharing: 'Wontumi mfa nkyɛ wɔ fon yi so.',
    exportFailed: 'Yɛantumi amfa mfonini no amfi. San bɔ mmɔden.',
    zoomOut: 'Ma ɛnyɛ ketewa',
    zoomIn: 'Ma ɛnyɛ kɛseɛ',
    tryAgain: 'San bɔ mmɔden',
    photoA11y: 'Nnuro krataa a wode too so',
    loadFailed: 'Yɛantumi amma mfonini no amma.',
    noPhoto: 'Mfonini biara nka ho.',
    closeViewer: 'To mfonini hwɛbea no mu',
    notFound: 'Yɛanhu nnuro krataa yi.',
    verifiedBy: '{name} asi so pi',
    rejectedBy: '{name} apo',
    beingReviewed: 'Wɔrehwɛ mu',
    waiting: 'Ɛretwɛn oduruyɛfoɔ',
    prescription: 'Nnuro krataa',
    idCopied: 'Wɔakɔpi ID no',
    idLine: 'ID {id}',
    moreOptions: 'Nneɛma bebree',
    coversMany: '{name} · nneɛma {count}',
    uploaded: 'Wɔde too so {when}',
    reason: 'Deɛ enti',
    review: 'NHWEHWƐMU',
    private: 'Wo nko ara',
    privateMeta: 'Wo ne {pharmacy} nko ara na wobɛtumi ahu',
    export: 'Yi fi',
    reupload: 'San fa to so',
  },
  gaa: {
    prescriptionId: 'Tsofa wolo {id}',
    quoteId: 'Tsɔɔ ID nɛɛ kɛji oobaatsɛ tsofa shĩa lɛ.',
    copyId: 'Kɔpi ID lɛ',
    close: 'Ŋmɛ',
    noSharing: 'Onyɛŋ okɛ nɔ ko aha mɛi yɛ tɛlifoŋ nɛɛ nɔ.',
    exportFailed: 'Wɔnyɛɛɛ wɔjie mfoniri lɛ. Ka ekoŋŋ.',
    zoomOut: 'Ha efee bibioo',
    zoomIn: 'Ha efee agbo',
    tryAgain: 'Ka ekoŋŋ',
    photoA11y: 'Tsofa wolo ni okɛya lɛ',
    loadFailed: 'Wɔnyɛɛɛ wɔjie mfoniri lɛ kpo.',
    noPhoto: 'Mfoniri ko bɛ he.',
    closeViewer: 'Ŋmɛ mfoniri kwɛmɔ lɛ',
    notFound: 'Wɔnaaa tsofa wolo nɛɛ.',
    verifiedBy: '{name} ekpɛ nɔ',
    rejectedBy: '{name} ekpoo',
    beingReviewed: 'Akwɛɔ mli',
    waiting: 'Emiimɛ tsofatsɛ',
    prescription: 'Tsofa wolo',
    idCopied: 'Akɔpi ID lɛ',
    idLine: 'ID {id}',
    moreOptions: 'Nibii krokomɛi',
    coversMany: '{name} · nibii {count}',
    uploaded: 'Akɛya {when}',
    reason: 'Nɔ hewɔ',
    review: 'KWƐMƆ',
    private: 'Bo pɛ',
    privateMeta: 'Bo kɛ {pharmacy} pɛ nyɛɔ naa',
    export: 'Jie kpo',
    reupload: 'Kɛya ekoŋŋ',
  },
  ee: {
    prescriptionId: 'Atikeŋɔŋlɔ {id}',
    quoteId: 'Gblɔ ID sia ne èle ka ƒom na atikedzraƒe la.',
    copyId: 'Kɔpi ID la',
    close: 'Tui',
    noSharing: 'Màte ŋu ama nu le fon sia dzi o.',
    exportFailed: 'Míete ŋu ɖe foto la do o. Gatee kpɔ.',
    zoomOut: 'Na wòasue',
    zoomIn: 'Na wòalolo',
    tryAgain: 'Gatee kpɔ',
    photoA11y: 'Atikeŋɔŋlɔ si nèɖo ɖa',
    loadFailed: 'Míete ŋu ɖe foto la fia o.',
    noPhoto: 'Foto aɖeke meli o.',
    closeViewer: 'Tu fotokpɔƒe la',
    notFound: 'Míekpɔ atikeŋɔŋlɔ sia o.',
    verifiedBy: '{name} ɖo kpe edzi',
    rejectedBy: '{name} gbee',
    beingReviewed: 'Wole edzrɔ̃m',
    waiting: 'Le atikedzrala lalam',
    prescription: 'Atikeŋɔŋlɔ',
    idCopied: 'Wokɔpi ID la',
    idLine: 'ID {id}',
    moreOptions: 'Nu bubuwo',
    coversMany: '{name} · nu {count}',
    uploaded: 'Woɖoe ɖa {when}',
    reason: 'Susu',
    review: 'DZODZRƆ̃',
    private: 'Wò ɖeɖe',
    privateMeta: 'Wò kple {pharmacy} koe ate ŋu akpɔe',
    export: 'Ɖe do',
    reupload: 'Gaɖoe ɖa',
  },
  ha: {
    prescriptionId: 'Takardar magani {id}',
    quoteId: 'Ambaci wannan ID idan za ka tuntuɓi kantin magani.',
    copyId: 'Kwafi ID',
    close: 'Rufe',
    noSharing: 'Ba a iya rabawa a wannan waya ba.',
    exportFailed: 'Ba a iya fitar da hoton ba. Sake gwadawa.',
    zoomOut: 'Rage girma',
    zoomIn: 'Ƙara girma',
    tryAgain: 'Sake gwadawa',
    photoA11y: 'Takardar maganin da ka ɗora',
    loadFailed: 'Ba a iya buɗe hoton ba.',
    noPhoto: 'Babu hoton da aka haɗa.',
    closeViewer: 'Rufe mai duba hoto',
    notFound: 'Ba a sami wannan takardar magani ba.',
    verifiedBy: '{name} ya tabbatar',
    rejectedBy: '{name} ya ƙi',
    beingReviewed: 'Ana dubawa',
    waiting: 'Ana jiran likitan magunguna',
    prescription: 'Takardar magani',
    idCopied: 'An kwafi ID',
    idLine: 'ID {id}',
    moreOptions: 'Ƙarin zaɓuɓɓuka',
    coversMany: '{name} · abubuwa {count}',
    uploaded: 'An ɗora {when}',
    reason: 'Dalili',
    review: 'DUBAWA',
    private: 'Na sirri',
    privateMeta: 'Kai da {pharmacy} kaɗai ke iya gani',
    export: 'Fitar',
    reupload: 'Sake ɗorawa',
  },
});

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const STEP = 0.5;

function formatWhen(ms: number, locale: string): string {
  return new Date(ms).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function PrescriptionViewer() {
  const tr = useT(S);
  const locale = useLocale();
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const { uri: localUri, id } = useLocalSearchParams<{ uri?: string; id?: string }>();

  const script = usePrescriptionStore((s) => (id ? s.items.find((p) => p.id === id) : undefined));
  const hydrated = usePrescriptionStore((s) => s.hydrated);
  const { data: products } = useProducts();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // The pharmacist may have acted since the list was last loaded.
  useEffect(() => {
    void loadPrescriptions();
  }, []);

  const image = useQuery({
    queryKey: ['prescription-image', script?.imagePath],
    queryFn: () => prescriptionImageUrl(script!.imagePath!),
    enabled: !localUri && SUPABASE_CONFIGURED && Boolean(script?.imagePath),
    // The link lasts ten minutes; refresh well inside that.
    staleTime: 5 * 60_000,
  });
  const imageUri = localUri || image.data;

  // --- Zoom and pan -------------------------------------------------------------

  // The page fills the space above the sheet; its measured size bounds panning.
  const pageW = useSharedValue(d(286));
  const pageH = useSharedValue(d(400));
  const [zoomPct, setZoomPct] = useState(100);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const clampPan = (value: number, size: number, s: number) => {
    'worklet';
    const max = (size * s - size) / 2;
    return Math.min(max, Math.max(-max, value));
  };

  const zoomTo = (next: number) => {
    const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    scale.value = withTiming(s);
    savedScale.value = s;
    tx.value = withTiming(clampPan(tx.value, pageW.value, s));
    ty.value = withTiming(clampPan(ty.value, pageH.value, s));
    savedTx.value = clampPan(tx.value, pageW.value, s);
    savedTy.value = clampPan(ty.value, pageH.value, s);
    setZoomPct(Math.round(s * 100));
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      tx.value = withTiming(clampPan(tx.value, pageW.value, scale.value));
      ty.value = withTiming(clampPan(ty.value, pageH.value, scale.value));
      savedTx.value = clampPan(tx.value, pageW.value, scale.value);
      savedTy.value = clampPan(ty.value, pageH.value, scale.value);
      runOnJS(setZoomPct)(Math.round(scale.value * 100));
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = clampPan(savedTx.value + e.translationX, pageW.value, scale.value);
      ty.value = clampPan(savedTy.value + e.translationY, pageH.value, scale.value);
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.value > 1 ? 1 : 2;
      scale.value = withTiming(next);
      savedScale.value = next;
      if (next === 1) {
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      }
      runOnJS(setZoomPct)(next * 100);
    });

  const gestures = Gesture.Simultaneous(pinch, pan, doubleTap);

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  // --- Actions ------------------------------------------------------------------

  const copyId = async () => {
    if (!script) return;
    await Clipboard.setStringAsync(script.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const moreOptions = () => {
    if (!script) return;
    showDialog({
      icon: 'prescription',
      title: tr('prescriptionId', { id: script.id }),
      message: tr('quoteId'),
      actions: [
        { label: tr('copyId'), icon: 'check', onPress: () => void copyId() },
        { label: tr('close'), variant: 'tertiary' },
      ],
    });
  };

  const exportPhoto = async () => {
    if (!imageUri || !script) return;
    setError(null);
    setExporting(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setError(tr('noSharing'));
        return;
      }
      let fileUri = imageUri;
      if (/^https?:/i.test(imageUri)) {
        // The share sheet needs a file, not a link. It goes to the app's own
        // cache, and is overwritten by the next export of the same script.
        const target = new File(Paths.cache, `prescription-${script.id}.jpg`);
        const downloaded = await File.downloadFileAsync(imageUri, target, { idempotent: true });
        fileUri = downloaded.uri;
      }
      await leaveAppFor(() => Sharing.shareAsync(fileUri, {
        mimeType: 'image/jpeg',
        dialogTitle: tr('prescriptionId', { id: script.id }),
      }));
    } catch (e) {
      console.warn('prescription export failed', e);
      setError(tr('exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const reupload = () =>
    router.replace({
      pathname: '/prescription-upload',
      params: { for: (script?.productIds ?? []).join(',') },
    });

  const close = () => (router.canGoBack() ? router.back() : router.replace('/prescriptions'));

  // --- Pieces -------------------------------------------------------------------

  const roundAction = (icon: IconName, label: string, onPress?: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: d(40),
        height: d(40),
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.bg.surfaceRaised,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={d(18)} tone="primary" />
    </Pressable>
  );

  const zoomButton = (icon: 'minus' | 'add', delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={delta < 0 ? tr('zoomOut') : tr('zoomIn')}
      hitSlop={6}
      disabled={!imageUri}
      onPress={() => zoomTo(zoomPct / 100 + delta)}
      style={({ pressed }) => ({
        width: d(32),
        height: d(32),
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.bg.surfaceSunken,
        opacity: !imageUri ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={d(15)} tone="primary" />
    </Pressable>
  );

  const pageMessage = (icon: IconName, text: string, retry?: () => void) => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: d(12), padding: d(24) }}>
      <Icon name={icon} size={d(28)} tone="secondary" />
      <Text variant="bodyS" tone="secondary" center style={{ fontSize: d(13), lineHeight: d(19) }}>
        {text}
      </Text>
      {retry ? <Button label={tr('tryAgain')} variant="secondary" size="small" onPress={retry} /> : null}
    </View>
  );

  const page = () => {
    if (imageUri && !imageFailed) {
      return (
        <GestureDetector gesture={gestures}>
          <Animated.View style={[{ width: '100%', height: '100%' }, pageStyle]}>
            <Image
              source={{ uri: imageUri }}
              resizeMode="contain"
              accessibilityLabel={tr('photoA11y')}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              style={{ width: '100%', height: '100%' }}
            />
            {!imageLoaded ? (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator color={t.colors.icon.brand} />
              </View>
            ) : null}
          </Animated.View>
        </GestureDetector>
      );
    }
    if (image.isLoading) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.icon.brand} />
        </View>
      );
    }
    if (image.isError || imageFailed) {
      return pageMessage('danger', tr('loadFailed'), () => {
        setImageFailed(false);
        void image.refetch();
      });
    }
    return pageMessage('image', tr('noPhoto'));
  };

  // --- Not found ------------------------------------------------------------------

  if (!script) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.colors.bg.surfaceSunken,
          paddingTop: insets.top + d(10),
          paddingHorizontal: d(24),
        }}
      >
        <View style={{ height: d(60), justifyContent: 'center' }}>
          {roundAction('close', tr('closeViewer'), close)}
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: d(12) }}>
          {hydrated ? (
            <>
              <Icon name="prescription" size={d(32)} tone="secondary" />
              <Text variant="bodyM" tone="secondary" center style={{ fontSize: d(14), lineHeight: d(21) }}>
                {tr('notFound')}
              </Text>
            </>
          ) : (
            <ActivityIndicator color={t.colors.icon.brand} />
          )}
        </View>
      </View>
    );
  }

  const covers = script.productIds
    .map((pid) => products?.find((p) => p.id === pid)?.name)
    .filter(Boolean) as string[];
  const reviewer = script.reviewedBy ?? script.pharmacy;
  const review: { icon: IconName; title: string; meta: string } =
    script.status === 'VERIFIED'
      ? {
          icon: 'shield-check',
          title: tr('verifiedBy', { name: reviewer }),
          meta: script.reviewedAt ? formatWhen(script.reviewedAt, locale) : script.pharmacy,
        }
      : script.status === 'REJECTED'
        ? {
            icon: 'danger',
            title: tr('rejectedBy', { name: reviewer }),
            meta: script.reviewedAt ? formatWhen(script.reviewedAt, locale) : script.pharmacy,
          }
        : {
            icon: 'clock',
            title: script.status === 'VERIFYING' ? tr('beingReviewed') : tr('waiting'),
            meta: script.pharmacy,
          };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.surfaceSunken }}>
      {/* Viewer bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(12),
          height: d(60),
          marginTop: insets.top + d(10),
          paddingHorizontal: d(24),
        }}
      >
        {roundAction('close', tr('closeViewer'), close)}
        <View style={{ flex: 1, gap: d(1) }}>
          <Text variant="labelM" center style={{ fontSize: d(14), lineHeight: d(18) }}>
            {tr('prescription')}
          </Text>
          <Text
            variant="caption"
            tone="tertiary"
            center
            accessibilityLiveRegion="polite"
            style={{ fontSize: d(12), lineHeight: d(16) }}
          >
            {copied ? tr('idCopied') : tr('idLine', { id: script.id })}
          </Text>
        </View>
        {roundAction('more', tr('moreOptions'), moreOptions)}
      </View>

      {/* Stage — fills the space between the bar and the sheet. The zoom pill
          floats over the bottom of the page; below it, the sheet hid it. */}
      <View style={{ flex: 1, paddingHorizontal: d(24), paddingTop: d(12), paddingBottom: d(16) }}>
        <View
          onLayout={(e) => {
            pageW.value = e.nativeEvent.layout.width;
            pageH.value = e.nativeEvent.layout.height;
          }}
          style={{
            flex: 1,
            borderRadius: d(10),
            overflow: 'hidden',
            backgroundColor: t.colors.bg.surface,
          }}
        >
          {page()}
        </View>

        {/* Zoom pill */}
        <View
          style={{
            position: 'absolute',
            bottom: d(28),
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(6),
            padding: d(6),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surfaceRaised,
          }}
        >
          {zoomButton('minus', -STEP)}
          <Text variant="labelM" center style={{ width: d(56), fontSize: d(14), lineHeight: d(18) }}>
            {zoomPct}%
          </Text>
          {zoomButton('add', STEP)}
        </View>
      </View>

      {/* Info sheet */}
      <View
        style={{
          maxHeight: '50%',
          borderTopLeftRadius: d(36),
          borderTopRightRadius: d(36),
          backgroundColor: t.colors.bg.surface,
          paddingTop: d(18),
        }}
      >
        <View
          style={{
            width: d(44),
            height: d(4),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.border.default,
            alignSelf: 'center',
          }}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            gap: d(14),
            paddingTop: d(14),
            paddingHorizontal: d(24),
            paddingBottom: Math.max(insets.bottom, d(20)) + d(26),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
            <View style={{ flex: 1, gap: d(3) }}>
              <Text variant="labelL" numberOfLines={2} style={{ fontSize: d(16), lineHeight: d(20) }}>
                {covers.length
                  ? covers.length > 1
                    ? tr('coversMany', { name: covers[0], count: covers.length })
                    : covers[0]
                  : tr('prescription')}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {tr('uploaded', { when: formatWhen(script.uploadedAt, locale) })}
              </Text>
            </View>
            <StatusPill status={script.status} />
          </View>

          {script.status === 'REJECTED' && script.note ? (
            <View
              style={{
                gap: d(4),
                paddingVertical: d(12),
                paddingHorizontal: d(14),
                borderRadius: d(16),
                backgroundColor: t.colors.bg.dangerSubtle,
              }}
            >
              <Text variant="labelS" tone="danger" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {tr('reason')}
              </Text>
              <Text variant="bodyS" style={{ fontSize: d(13), lineHeight: d(19) }}>
                {script.note}
              </Text>
            </View>
          ) : null}

          <View
            style={{
              gap: d(12),
              paddingVertical: d(14),
              paddingHorizontal: d(16),
              borderRadius: d(20),
              backgroundColor: t.colors.bg.surfaceRaised,
            }}
          >
            <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
              {tr('review')}
            </Text>
            {[
              review,
              {
                icon: 'profile' as IconName,
                title: tr('private'),
                meta: tr('privateMeta', { pharmacy: script.pharmacy }),
              },
            ].map((row) => (
              <View key={row.title} style={{ flexDirection: 'row', gap: d(10) }}>
                <Icon name={row.icon} size={d(18)} tone="primary" />
                <View style={{ flex: 1, gap: d(2) }}>
                  <Text variant="labelS" style={{ fontSize: d(12), lineHeight: d(16) }}>
                    {row.title}
                  </Text>
                  <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                    {row.meta}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {error ? <FormMessage>{error}</FormMessage> : null}

          <View style={{ flexDirection: 'row', gap: d(12) }}>
            <Button
              label={tr('export')}
              variant="secondary"
              size="medium"
              iconLeading="upload"
              style={{ flex: 1 }}
              loading={exporting}
              disabled={!imageUri || exporting}
              onPress={exportPhoto}
            />
            {script.status === 'REJECTED' ? (
              <Button
                label={tr('reupload')}
                size="medium"
                iconLeading="camera"
                style={{ flex: 1 }}
                onPress={reupload}
              />
            ) : null}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
