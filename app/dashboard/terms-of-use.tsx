import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsOfUseScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Use</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing and using the GrowMark application, you agree to be bound by these Terms of Use and all applicable laws and regulations.
        </Text>

        <Text style={styles.sectionTitle}>2. Use License</Text>
        <Text style={styles.paragraph}>
          GrowMark is provided as a decision support tool for small business owners. You are granted a limited license to use the app for your internal business monitoring.
        </Text>

        <Text style={styles.sectionTitle}>3. Accuracy of Data</Text>
        <Text style={styles.paragraph}>
          The accuracy of health scores and reports depends entirely on the accuracy of the sales data you enter. GrowMark is not responsible for business decisions made based on incorrect data entry.
        </Text>

        <Text style={styles.sectionTitle}>4. Disclaimer</Text>
        <Text style={styles.paragraph}>
          GrowMark is provided "as is". We make no warranties regarding the specific outcomes of your business performance. The health score is a mathematical model and should be one of many factors in your decision-making.
        </Text>

        <Text style={styles.sectionTitle}>5. Limitations</Text>
        <Text style={styles.paragraph}>
          In no event shall GrowMark be liable for any damages arising out of the use or inability to use the application.
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
