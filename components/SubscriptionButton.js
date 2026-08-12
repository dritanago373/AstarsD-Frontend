// components/SubscriptionButton.js
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';

const SubscriptionButton = ({ 
  isSubscribed, 
  onPress, 
  loading, 
  variant = 'default' 
}) => {
  const getButtonStyle = () => {
    if (isSubscribed) {
      return [styles.button, styles.unsubscribeButton];
    }
    return [styles.button, styles.subscribeButton];
  };

  const getButtonText = () => {
    if (loading) return 'Processing...';
    if (isSubscribed) return '🔴 Unsubscribe';
    
    // Different text based on platform
    if (Platform.OS === 'ios') {
      return '💳 Subscribe on App Store';
    } else if (Platform.OS === 'android') {
      return '💳 Subscribe on Play Store';
    }
    return '💳 Subscribe Now';
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.buttonText}>{getButtonText()}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
  },
  unsubscribeButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SubscriptionButton;