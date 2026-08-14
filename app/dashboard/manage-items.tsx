import { translateBatch } from '@/lib/translationService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { useTranslation } from '../../hooks/useTranslation';
import { supabase } from '../../lib/supabase';

export default function ManageItemsScreen() {
  const { t, language } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({
    item_name: '',
    selling_price: '',
    cost_price: '',
    min_daily_target: '',
    min_weekly_target: ''
  });
  const [updating, setUpdating] = useState(false);
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  const fetchItems = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: owner } = await supabase.from('owners').select('id').eq('user_id', session.user.id).single();
    if (owner) {
      const { data } = await supabase
        .from('items')
        .select('id, owner_id, item_name, selling_price, cost_price, min_daily_target, min_weekly_target')
        .eq('owner_id', owner.id);
      if (data) {
        const names = data.map((item: any) => item.item_name);
        const translatedNames = await translateBatch(names, language);
        setItems(data.map((item: any, i: number) => ({ ...item, item_name: translatedNames[i] })));
      }
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [language])
  );

  const handleDelete = (id: string, name: string) => {
    Alert.alert(t('Delete Item'), `${t('Are you sure you want to delete')} ${name}?`, [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: async () => {
          await supabase.from('items').delete().eq('id', id);
          fetchItems();
        }
      }
    ]);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setForm({
      item_name: item.item_name,
      selling_price: item.selling_price.toString(),
      cost_price: item.cost_price ? item.cost_price.toString() : '',
      min_daily_target: item.min_daily_target.toString(),
      min_weekly_target: item.min_weekly_target.toString()
    });
    setIsEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!form.item_name.trim()) {
      Alert.alert(t('Error'), t('Item Name cannot be empty'));
      return;
    }
    const sellPrice = parseFloat(form.selling_price);
    if (isNaN(sellPrice) || sellPrice <= 0) {
      Alert.alert(t('Error'), t('Selling Price must be a number greater than 0'));
      return;
    }
    const dailyTarget = parseInt(form.min_daily_target, 10);
    if (isNaN(dailyTarget) || dailyTarget <= 0) {
      Alert.alert(t('Error'), t('Min Daily Target must be a number greater than 0'));
      return;
    }
    const weeklyTarget = parseInt(form.min_weekly_target, 10);
    if (isNaN(weeklyTarget) || weeklyTarget <= 0) {
      Alert.alert(t('Error'), t('Min Weekly Target must be a number greater than 0'));
      return;
    }
    if (form.cost_price) {
      const costPrice = parseFloat(form.cost_price);
      if (isNaN(costPrice) || costPrice <= 0) {
        Alert.alert(t('Error'), t('Cost Price must be a number greater than 0'));
        return;
      }
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({
          item_name: form.item_name,
          selling_price: sellPrice,
          cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
          min_daily_target: dailyTarget,
          min_weekly_target: weeklyTarget
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      Alert.alert(t('Success'), t('Item updated successfully'));
      setIsEditModalVisible(false);
      fetchItems();
    } catch (error: any) {
      Alert.alert(t('Error'), error.message);
    } finally {
      setUpdating(false);
    }
  };

  const openAddModal = () => {
    setForm({
      item_name: '',
      selling_price: '',
      cost_price: '',
      min_daily_target: '',
      min_weekly_target: ''
    });
    setIsAddModalVisible(true);
  };

  const handleAdd = async () => {
    if (!form.item_name.trim()) {
      Alert.alert(t('Error'), t('Item Name cannot be empty'));
      return;
    }
    const sellPrice = parseFloat(form.selling_price);
    if (isNaN(sellPrice) || sellPrice <= 0) {
      Alert.alert(t('Error'), t('Selling Price must be a number greater than 0'));
      return;
    }
    const dailyTarget = parseInt(form.min_daily_target, 10);
    if (isNaN(dailyTarget) || dailyTarget <= 0) {
      Alert.alert(t('Error'), t('Min Daily Target must be a number greater than 0'));
      return;
    }
    const weeklyTarget = parseInt(form.min_weekly_target, 10);
    if (isNaN(weeklyTarget) || weeklyTarget <= 0) {
      Alert.alert(t('Error'), t('Min Weekly Target must be a number greater than 0'));
      return;
    }

    setAdding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { data: owner } = await supabase.from('owners').select('id').eq('user_id', session.user.id).single();
      if (!owner) throw new Error('Owner profile not found');

      const { error } = await supabase
        .from('items')
        .insert([{
          owner_id: owner.id,
          item_name: form.item_name,
          selling_price: sellPrice,
          cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
          min_daily_target: dailyTarget,
          min_weekly_target: weeklyTarget
        }]);

      if (error) throw error;

      Alert.alert(t('Success'), t('Item added successfully'));
      setIsAddModalVisible(false);
      fetchItems();
    } catch (error: any) {
      Alert.alert(t('Error'), error.message);
    } finally {
      setAdding(false);
    }
  };

  const filteredItems = items.filter(i => i.item_name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.itemName}>{item.item_name}</Text>
        <Text style={styles.price}>₹{item.selling_price}</Text>
      </View>
      <View style={styles.targetsRow}>
        <Text style={styles.targetText}>{t('Daily Target')}: {item.min_daily_target}</Text>
        <Text style={styles.targetText}>{t('Weekly Target')}: {item.min_weekly_target}</Text>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          testID={`edit-item-${item.id}`}
          style={styles.actionBtn}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={16} color={Colors.primary} />
          <Text style={styles.actionText}>{t('Edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`delete-item-${item.id}`}
          style={styles.actionBtn}
          onPress={() => handleDelete(item.id, item.item_name)}
        >
          <Ionicons name="trash" size={16} color={Colors.danger} />
          <Text style={[styles.actionText, { color: Colors.danger }]}>{t('Delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/dashboard/profile')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Manage Items')}</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          testID="search-items-input"
          style={styles.searchInput}
          placeholder={t('Search items...')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('No items found.')}</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={24} color={Colors.card} />
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Edit Item')}</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formCard}>
                <Text style={styles.label}>{t('Item Name')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('Item Name')}
                  value={form.item_name}
                  onChangeText={(text) => setForm({ ...form, item_name: text })}
                />

                <View style={styles.row}>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>{t('Selling Price')} (₹)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={form.selling_price}
                      onChangeText={(text) => {
                        const clean = text.replace(/[^0-9.]/g, '');
                        const parts = clean.split('.');
                        const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : clean;
                        setForm({ ...form, selling_price: sanitized });
                      }}
                    />
                  </View>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>{t('Cost Price')} (₹)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t('Optional')}
                      keyboardType="decimal-pad"
                      value={form.cost_price}
                      onChangeText={(text) => {
                        const clean = text.replace(/[^0-9.]/g, '');
                        const parts = clean.split('.');
                        const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : clean;
                        setForm({ ...form, cost_price: sanitized });
                      }}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>{t('Daily Target')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      keyboardType="number-pad"
                      value={form.min_daily_target}
                      onChangeText={(text) => setForm({ ...form, min_daily_target: text.replace(/[^0-9]/g, '') })}
                    />
                  </View>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>{t('Weekly Target')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      keyboardType="number-pad"
                      value={form.min_weekly_target}
                      onChangeText={(text) => setForm({ ...form, min_weekly_target: text.replace(/[^0-9]/g, '') })}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]} 
                onPress={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color={Colors.card} />
                ) : (
                  <Text style={styles.saveBtnText}>{t('Save Changes')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Add New Item')}</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formCard}>
                <Text style={styles.label}>{t('Item Name')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('Item Name')}
                  value={form.item_name}
                  onChangeText={(text) => setForm({ ...form, item_name: text })}
                />

                <View style={styles.row}>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>{t('Selling Price')} (₹)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={form.selling_price}
                      onChangeText={(text) => {
                        const clean = text.replace(/[^0-9.]/g, '');
                        const parts = clean.split('.');
                        const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : clean;
                        setForm({ ...form, selling_price: sanitized });
                      }}
                    />
                  </View>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>{t('Cost Price')} (₹)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t('Optional')}
                      keyboardType="decimal-pad"
                      value={form.cost_price}
                      onChangeText={(text) => {
                        const clean = text.replace(/[^0-9.]/g, '');
                        const parts = clean.split('.');
                        const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : clean;
                        setForm({ ...form, cost_price: sanitized });
                      }}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>{t('Daily Target')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      keyboardType="number-pad"
                      value={form.min_daily_target}
                      onChangeText={(text) => setForm({ ...form, min_daily_target: text.replace(/[^0-9]/g, '') })}
                    />
                  </View>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.label}>{t('Weekly Target')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      keyboardType="number-pad"
                      value={form.min_weekly_target}
                      onChangeText={(text) => setForm({ ...form, min_weekly_target: text.replace(/[^0-9]/g, '') })}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                testID="add-item-button"
                style={[styles.modalBtn, styles.saveBtn]} 
                onPress={handleAdd}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color={Colors.card} />
                ) : (
                  <Text style={styles.saveBtnText}>{t('Add Item')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, margin: 20, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 15 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: Colors.textPrimary },
  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary },
  price: { fontSize: 16, fontWeight: 'bold', color: Colors.success },
  targetsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  targetText: { fontSize: 12, color: Colors.textSecondary },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, gap: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 14, fontWeight: '500', color: Colors.primary },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, marginTop: 20 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  formContent: { flex: 1, padding: 24 },
  formCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.background, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  halfInputContainer: { flex: 1 },
  modalFooter: { flexDirection: 'row', padding: 24, gap: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  saveBtn: { backgroundColor: Colors.primary },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.textSecondary },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.card },
});
