import React, { PropsWithChildren } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../../theme/theme';

interface ScreenContainerProps extends PropsWithChildren {
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
}

export const ScreenContainer = ({
  children,
  contentStyle,
  scroll = true
}: ScreenContainerProps) => {
  const { width } = useWindowDimensions();
  const maxWidth = width >= 760 ? 640 : undefined;

  const content = (
    <View style={[styles.content, { maxWidth }, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.background, colors.backgroundSoft, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  safeArea: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 112
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg
  }
});
