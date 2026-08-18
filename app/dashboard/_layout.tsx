import { Tabs } from 'expo-router';
import CustomBottomNav from '../../components/CustomBottomNav';

export default function DashboardLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, lazy: false }}
      tabBar={(props) => <CustomBottomNav {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sales-entry" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="profile" />
      {/* Hidden screens from bottom nav but part of dashboard stack */}
      <Tabs.Screen name="forecast" options={{ href: null }} />
      <Tabs.Screen name="daily-analysis" options={{ href: null }} />
      <Tabs.Screen name="health-score" options={{ href: null }} />
      <Tabs.Screen name="growth-tips" options={{ href: null }} />
      <Tabs.Screen name="manage-items" options={{ href: null }} />
      <Tabs.Screen name="language" options={{ href: null }} />
      <Tabs.Screen name="privacy-policy" options={{ href: null }} />
      <Tabs.Screen name="terms-of-use" options={{ href: null }} />
    </Tabs>
  );
}
