import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslation } from '../../hooks/useTranslation';

const LANGUAGES = [
  { display: 'English', key: 'English' },
  { display: 'தமிழ் (Tamil)', key: 'Tamil' },
  { display: 'हिन्दी (Hindi)', key: 'Hindi' },
  { display: 'తెలుగు (Telugu)', key: 'Telugu' },
  { display: 'ಕನ್ನಡ (Kannada)', key: 'Kannada' },
  { display: 'മലയാളം (Malayalam)', key: 'Malayalam' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const handleSelect = async (key: string) => {
    await setLanguage(key);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/dashboard/profile')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Language')}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          {LANGUAGES.map((lang, index) => (
            <React.Fragment key={lang.key}>
              <TouchableOpacity style={styles.row} onPress={() => handleSelect(lang.key)}>
                <Text style={styles.label}>{lang.display}</Text>
                {language === lang.key && <Ionicons name="checkmark" size={24} color={Colors.accent} />}
              </TouchableOpacity>
              {index < LANGUAGES.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  content: { padding: 20 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 16, color: Colors.textPrimary, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
});
