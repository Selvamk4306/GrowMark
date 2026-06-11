import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          GrowMark collects business-related data such as sales figures, item names, and inventory targets. We also collect basic profile information like your shop name and username.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Data</Text>
        <Text style={styles.paragraph}>
          Your data is used exclusively to provide you with business health scores, alerts, and performance reports. We do not use your data for advertising or marketing purposes.
        </Text>

        <Text style={styles.sectionTitle}>3. Data Security</Text>
        <Text style={styles.paragraph}>
          All data is transmitted securely and stored in encrypted databases. Access to your data is strictly limited to your authenticated session.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Sharing</Text>
        <Text style={styles.paragraph}>
          We do not share, sell, or rent your business data to any third parties. Your data is your property.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to access, modify, or delete your business data at any time through the Manage Items and Profile settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  content: { flex: 1, padding: 20 },
  scrollContent: { paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, marginTop: 20, marginBottom: 10 },
  paragraph: { fontSize: 16, color: Colors.textPrimary, lineHeight: 24, marginBottom: 15 },
});
