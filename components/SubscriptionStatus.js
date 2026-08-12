// components/SubscriptionStatus.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PLANS = {
  single: { name: 'Single', businesses: 1 },
  pro: { name: 'Pro', businesses: 5 },
  business: { name: 'Business', businesses: 'Unlimited' },
};

const SubscriptionStatus = ({ user }) => {
  const currentPlan = user?.plan || 'single';
  const planInfo = PLANS[currentPlan];

  const getStatusColor = () => {
    if (user?.isSubscribed) return '#34C759';
    if (user?.trialEnds && new Date(user.trialEnds) > new Date()) return '#FF9500';
    return '#FF3B30';
  };

  const getStatusText = () => {
    if (user?.isSubscribed) return '✅ Active Subscription';
    if (user?.trialEnds && new Date(user.trialEnds) > new Date()) {
      const daysLeft = Math.ceil((new Date(user.trialEnds) - new Date()) / (1000 * 60 * 60 * 24));
      return `⏳ Trial (${daysLeft} days left)`;
    }
    return '❌ Expired';
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
      
      <View style={styles.planInfo}>
        <Text style={styles.planLabel}>Plan: </Text>
        <Text style={styles.planValue}>{planInfo?.name || 'Single'}</Text>
      </View>

      <View style={styles.featuresContainer}>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🏢</Text>
          <Text style={styles.featureText}>
            {planInfo?.businesses === 'Unlimited' 
              ? 'Unlimited Businesses' 
              : `${planInfo?.businesses} Business${planInfo?.businesses > 1 ? 'es' : ''}`
            }
          </Text>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>💬</Text>
          <Text style={[styles.featureText, styles.unlimitedText]}>Unlimited Replies ✅</Text>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🌐</Text>
          <Text style={styles.featureText}>All Languages</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  planLabel: {
    fontSize: 14,
    color: '#666',
  },
  planValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  featuresContainer: {
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  featureIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 24,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
  },
  unlimitedText: {
    color: '#34C759',
    fontWeight: '600',
  },
});

export default SubscriptionStatus;