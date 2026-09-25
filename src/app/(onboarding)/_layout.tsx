import { Stack } from 'expo-router';
import { motion } from '@/theme/tokens';
export default function OnboardingLayout() {
  return <Stack screenOptions={{
        headerShown: false,
        // Matches the root stack — a nested navigator does not inherit it.
        animation: 'fade',
        animationDuration: motion.duration.base,
      }} />;
}
