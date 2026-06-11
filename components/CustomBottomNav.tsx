import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

import { useTranslation } from '../hooks/useTranslation';

export default function CustomBottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        // Skip non-tab screens if they somehow end up here, or filter explicitly.
        // We will assume the routes configured in Tabs are exactly the 5 we want.
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        let iconName: keyof typeof Ionicons.glyphMap = 'home';
        if (route.name === 'index') iconName = isFocused ? 'home' : 'home-outline';
        else if (route.name === 'sales-entry') iconName = isFocused ? 'cash' : 'cash-outline';
        else if (route.name === 'alerts') iconName = isFocused ? 'notifications' : 'notifications-outline';
        else if (route.name === 'reports') iconName = isFocused ? 'bar-chart' : 'bar-chart-outline';
        else if (route.name === 'profile') iconName = isFocused ? 'person' : 'person-outline';

        // Filter out screens that shouldn't be in tabs
        if (!['index', 'sales-entry', 'alerts', 'reports', 'profile'].includes(route.name)) {
          return null;
        }

        const displayLabel = route.name === 'index' ? t('Home') : 
                             route.name === 'sales-entry' ? t('Sales') : 
                             route.name === 'alerts' ? t('Alerts') : 
                             route.name === 'reports' ? t('Reports') : t('Profile');

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={(options as any).tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <Ionicons
              name={iconName}
              size={24}
              color={isFocused ? Colors.accent : Colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: isFocused ? Colors.accent : Colors.textSecondary }]}>
              {displayLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 24, // Safe area for iOS
    paddingTop: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
