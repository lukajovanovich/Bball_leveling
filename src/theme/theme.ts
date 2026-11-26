// Court orange drives actions and selection; gold is reserved for XP, levels
// and rewards. The category hues only label attribute groups and workouts.
export const colors = {
  background: '#05070D',
  backgroundSoft: '#090D16',
  panel: '#0E1420',
  panelElevated: '#121A2A',
  panelHighlight: '#182236',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#F4F6FA',
  textMuted: '#9AA7BA',
  textSubtle: '#647187',
  black: '#02040A',
  gold: '#F2CF6B',
  court: '#E07B39',
  blue: '#6FA4DE',
  green: '#63C58F',
  orange: '#E9A062',
  red: '#E5646E',
  purple: '#A68ADB',
  yellow: '#D9BE62',
  success: '#5FD39E'
};

// Barlow Condensed reads like a jersey number or a scoreboard digit, so it
// carries every rating and headline. Barlow (same family, normal width) is the
// reading face. Custom fonts ignore fontWeight on Android, so each weight is
// its own family.
export const fonts = {
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodySemiBold: 'Barlow_600SemiBold',
  display: 'BarlowCondensed_600SemiBold',
  displayBold: 'BarlowCondensed_700Bold'
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
};

// Small, deliberate corners: inputs and buttons are the tightest, panels a
// little softer. Pills are kept for the bar tracks only.
export const radii = {
  sm: 4,
  md: 6,
  lg: 10,
  xl: 14,
  pill: 999
};
