import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../constants/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  workingDays?: string[];
};

// Generates past 30 days
const generateDates = (workingDays?: string[]) => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    if (workingDays && workingDays.length > 0) {
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      if (!workingDays.includes(dayName)) continue;
    }

    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

export default function DatePickerModal({ visible, onClose, selectedDate, onSelectDate, workingDays }: Props) {
  const dates = generateDates(workingDays);

  const handleSelect = (d: string) => {
    onSelectDate(d);
    onClose();
  };

  const formatDateLabel = (dStr: string) => {
    const d = new Date(dStr);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dStr === today) return 'Today';
    if (dStr === yesterday) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.list}>
            {dates.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.item, selectedDate === d && styles.selectedItem]}
                onPress={() => handleSelect(d)}
              >
                <Text style={[styles.itemText, selectedDate === d && styles.selectedText]}>
                  {formatDateLabel(d)}
                </Text>
                <Text style={styles.itemSubText}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  closeBtn: {
    color: Colors.accent,
    fontWeight: '600',
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: Colors.highlight,
  },
  itemText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  selectedText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  itemSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
