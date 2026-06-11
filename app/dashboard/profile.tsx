import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedShopName, setEditedShopName] = useState('');
  const [editedShopType, setEditedShopType] = useState('');
  const [editedWorkingDays, setEditedWorkingDays] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: owner } = await supabase.from('owners').select('*').eq('user_id', session.user.id).single();
    if (owner) {
      setProfile({
        ...owner,
        email: session.user.email,
      });
      setEditedName(owner.username || '');
      setEditedShopName(owner.shop_name || '');
      setEditedShopType(owner.shop_type || '');
      setEditedWorkingDays(owner.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editedName.trim() || !editedShopName.trim()) {
      Alert.alert(t('Error'), t('Please fill in all fields.'));
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('owners')
        .update({
          username: editedName,
          shop_name: editedShopName,
          shop_type: editedShopType,
          working_days: editedWorkingDays,
        })
        .eq('id', profile.id);

      if (error) throw error;

      Alert.alert(t('Success'), t('Profile updated successfully!'));
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      Alert.alert(t('Error'), error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(t('Logout'), t('Are you sure you want to log out?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Logout'),
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/auth/login' as any);
        }
      }
    ]);
  };

  const toggleWorkingDay = (day: string) => {
    if (editedWorkingDays.includes(day)) {
      setEditedWorkingDays(editedWorkingDays.filter(d => d !== day));
    } else {
      const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const newDays = [...editedWorkingDays, day];
      newDays.sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
      setEditedWorkingDays(newDays);
    }
  };

  const formatWorkingDays = (days: string[]) => {
    if (!days || days.length === 0) return '';
    const joined = days.join(',');
    if (joined === 'Mon,Tue,Wed,Thu,Fri,Sat') return 'Mon - Sat';
    if (joined === 'Mon,Tue,Wed,Thu,Fri,Sat,Sun') return 'Mon - Sun';
    return days.join(', ');
  };



  const settingsLinks = [
    { title: t('Manage Items'), icon: 'cube-outline', route: '/dashboard/manage-items' },
    { title: t('Language'), icon: 'language-outline', route: '/dashboard/language' },
  ];

  if (!profile) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.username?.charAt(0).toUpperCase()}</Text>
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Full Name')}</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder={t('Enter your full name')}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Shop Name')}</Text>
              <TextInput
                style={styles.input}
                value={editedShopName}
                onChangeText={setEditedShopName}
                placeholder={t('Shop Name')}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Shop Type')}</Text>
              <TextInput
                style={styles.input}
                value={editedShopType}
                onChangeText={setEditedShopType}
                placeholder={t('Shop Type')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Working Days')}</Text>
              <View style={styles.daysContainer}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                  const isSelected = editedWorkingDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayPill, isSelected && styles.dayPillSelected]}
                      onPress={() => toggleWorkingDay(day)}
                    >
                      <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{t(day)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setIsEditing(false)}
                disabled={updating}
              >
                <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleUpdateProfile}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('Save Changes')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.username}>{profile.username}</Text>
            <Text style={styles.email}>{profile.email}</Text>

            <TouchableOpacity style={styles.editBadge} onPress={() => setIsEditing(true)}>
              <Ionicons name="create-outline" size={16} color={Colors.accent} />
              <Text style={styles.editBadgeText}>{t('Edit Profile')}</Text>
            </TouchableOpacity>

            <View style={styles.shopInfoCard}>
              <View style={styles.shopInfoRow}>
                <Text style={styles.shopLabel}>{t('Shop Name')}</Text>
                <Text style={styles.shopValue}>{profile.shop_name}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.shopInfoRow}>
                <Text style={styles.shopLabel}>{t('Shop Type')}</Text>
                <Text style={styles.shopValue}>{profile.shop_type}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.shopInfoRow}>
                <Text style={styles.shopLabel}>{t('Working Days')}</Text>
                <Text style={styles.shopValue}>{formatWorkingDays(profile.working_days || [])}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Settings Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Settings')}</Text>
        <View style={styles.settingsCard}>
          {settingsLinks.map((link, idx) => (
            <TouchableOpacity key={idx} style={styles.settingRow} onPress={() => router.push(link.route as any)}>
              <View style={styles.settingIconBox}>
                <Ionicons name={link.icon as any} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.settingText}>{link.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        <Text style={styles.logoutText}>{t('Logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: Colors.card },
  username: { fontSize: 28, fontWeight: 'bold', color: Colors.primary, marginBottom: 5 },
  email: { fontSize: 14, color: Colors.textSecondary, marginBottom: 15 },
  editBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: Colors.accent, marginBottom: 20 },
  editBadgeText: { fontSize: 12, color: Colors.accent, fontWeight: '600', marginLeft: 4 },
  editForm: { width: '100%', gap: 15, marginTop: 10 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 16, color: Colors.textPrimary },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  saveButton: { backgroundColor: Colors.primary },
  cancelButtonText: { color: Colors.textSecondary, fontWeight: '600' },
  saveButtonText: { color: '#FFF', fontWeight: 'bold' },
  shopInfoCard: { width: '100%', backgroundColor: Colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Colors.border },
  shopInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shopLabel: { fontSize: 14, color: Colors.textSecondary },
  shopValue: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 15 },
  section: { paddingHorizontal: 20, marginTop: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 15 },
  settingsCard: { backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.navyLight, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  settingText: { flex: 1, fontSize: 16, color: Colors.textPrimary, fontWeight: '500' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 30, padding: 16, backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.danger },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: Colors.danger, marginLeft: 10 },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dayPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.primary },
  dayPillSelected: { backgroundColor: Colors.primary },
  dayText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  dayTextSelected: { color: Colors.card },
});
