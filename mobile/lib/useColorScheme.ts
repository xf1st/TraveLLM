import { useColorScheme as useRNColorScheme } from 'react-native';
import { Colors } from '../constants/theme';

export function useThemeColors() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  return {
    colors: isDark ? Colors.dark : Colors.light,
    isDark,
  };
}
