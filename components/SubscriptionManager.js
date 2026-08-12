// components/SubscriptionManager.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import SubscriptionStatus from './SubscriptionStatus';
import { subscriptionService } from '../services/subscriptionService';

// Plan definitions
const PLANS = {
  single: {
    id: 'single',
    name: 'Single',
    price: 15,
    businesses: 1,
    replies: 'Unlimited',
    features: ['1 Business', 'Unlimited Replies', 'All Languages', 'Email Support'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 30,
    businesses: 5,
    replies: 'Unlimited',
    features: ['5 Businesses', 'Unlimited Replies', 'All Languages', 'Priority Support'],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 50,
    businesses: 'Unlimited',
    replies: 'Unlimited',
    features: ['Unlimited Businesses', 'Unlimited Replies', 'All Languages', '24/7 Support'],
  },
};

const SubscriptionManager = ({ 
  user, 
  token, 
  setUser, 
  loading, 
  setLoading,
  API_URL 
}) => {
  const [showPlans, setShowPlans] = useState(false);
  const currentPlan = user?.plan || 'single';
  const isSubscribed = user?.isSubscribed || false;

  // ===== Handlers =====
  const handleSubscribe = async () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        '🍎 App Store Purchase',
        'You will be redirected to the App Store to complete your subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: async () => {
              await processSubscription('single');
            }
          }
        ]
      );
    } else if (Platform.OS === 'android') {
      Alert.alert(
        '🤖 Google Play Purchase',
        'You will be redirected to Google Play to complete your subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: async () => {
              await processSubscription('single');
            }
          }
        ]
      );
    } else {
      await processSubscription('single');
    }
  };

  const processSubscription = async (planId) => {
    try {
      setLoading(true);
      const response = await subscriptionService.subscribe(token, planId);
      
      if (response.success) {
        setUser({ ...user, isSubscribed: true, plan: planId });
        Alert.alert(
          '🎉 Success',
          `You are now subscribed to the ${PLANS[planId].name} plan!`,
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to subscribe');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = () => {
    Alert.alert(
      'Confirm Unsubscribe',
      'Are you sure you want to unsubscribe? You will lose access to premium features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Unsubscribe',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await subscriptionService.unsubscribe(token);
              
              if (response.success) {
                setUser({ ...user, isSubscribed: false });
                Alert.alert('Success', 'You have been unsubscribed.');
              } else {
                Alert.alert('Error', response.message || 'Failed to unsubscribe');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error. Make sure backend is running.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleUpgrade = (planId) => {
    Alert.alert(
      `Upgrade to ${PLANS[planId].name}`,
      `$${PLANS[planId].price}/month\n\nFeatures:\n• ${PLANS[planId].features.join('\n• ')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade Now',
          onPress: async () => {
            await processSubscription(planId);
          }
        }
      ]
    );
  };

  const handleDowngrade = (planId) => {
    Alert.alert(
      `Downgrade to ${PLANS[planId].name}`,
      `Are you sure you want to switch to the ${PLANS[planId].name} plan? You will lose access to features of your current plan.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Downgrade',
          style: 'destructive',
          onPress: async () => {
            await processSubscription(planId);
          }
        }
      ]
    );
  };

  // ===== Render =====
  return (
    <View style={styles.container}>
      <SubscriptionStatus user={user} />
      
      <View style={styles.planInfo}>
        <Text style={styles.planLabel}>Current Plan:</Text>
        <Text style={styles.planName}>
          {isSubscribed ? PLANS[currentPlan]?.name : 'No active subscription'}
        </Text>
        {isSubscribed && (
          <Text style={styles.planPrice}>${PLANS[currentPlan]?.price || 15}/mo</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {isSubscribed ? (
          <TouchableOpacity 
            style={styles.unsubscribeButton}
            onPress={handleUnsubscribe}
            disabled={loading}
          >
            <Text style={styles.unsubscribeButtonText}>
              {loading ? 'Processing...' : 'Unsubscribe'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            disabled={loading}
          >
            <Text style={styles.subscribeButtonText}>
              {loading ? 'Processing...' : 'Subscribe Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Show Plans Toggle */}
      <TouchableOpacity 
        style={styles.showPlansButton}
        onPress={() => setShowPlans(!showPlans)}
      >
        <Text style={styles.showPlansText}>
          {showPlans ? 'Hide Plans' : '📋 View All Plans'}
        </Text>
      </TouchableOpacity>

      {/* Plan Cards */}
      {showPlans && (
        <ScrollView style={styles.plansContainer}>
          {Object.keys(PLANS).map((planId) => {
            const plan = PLANS[planId];
            const isCurrent = isSubscribed && currentPlan === planId;
            // Determine if plan is higher or lower than current
            const planOrder = ['single', 'pro', 'business'];
            const currentIndex = planOrder.indexOf(currentPlan);
            const planIndex = planOrder.indexOf(planId);
            const isHigher = planIndex > currentIndex;
            const isLower = planIndex < currentIndex;

            let buttonLabel = null;
            let onPress = null;

            if (!isSubscribed) {
              // Not subscribed: show "Select" for all
              buttonLabel = 'Select';
              onPress = () => processSubscription(planId);
            } else if (isCurrent) {
              // Current – no button
              buttonLabel = null;
              onPress = null;
            } else if (isHigher) {
              buttonLabel = 'Upgrade';
              onPress = () => handleUpgrade(planId);
            } else if (isLower) {
              buttonLabel = 'Downgrade';
              onPress = () => handleDowngrade(planId);
            }

            return (
              <View key={planId} style={[
                styles.planCard,
                isCurrent && styles.planCardCurrent,
              ]}>
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>{plan.name}</Text>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.planPriceLarge}>${plan.price}/mo</Text>
                {plan.businesses === 'Unlimited' ? (
                  <Text style={styles.planFeature}>♾️ Unlimited Businesses</Text>
                ) : (
                  <Text style={styles.planFeature}>🏢 {plan.businesses} Businesses</Text>
                )}
                <Text style={styles.planFeature}>💬 {plan.replies} Replies</Text>
                {plan.features.slice(2).map((feature, index) => (
                  <Text key={index} style={styles.planFeature}>✅ {feature}</Text>
                ))}
                {buttonLabel && (
                  <TouchableOpacity 
                    style={styles.planSelectButton}
                    onPress={onPress}
                  >
                    <Text style={styles.planSelectText}>{buttonLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Platform info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {Platform.OS === 'ios' && '🍎 Secure payment via App Store'}
          {Platform.OS === 'android' && '🤖 Secure payment via Google Play'}
          {Platform.OS === 'web' && '💳 Secure payment via Stripe'}
        </Text>
        <Text style={styles.subInfoText}>
          Cancel anytime • 14-day free trial
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  planLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  planName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  planPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 12,
  },
  // Subscribe button – blue
  subscribeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Unsubscribe button – neutral (no red)
  unsubscribeButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  unsubscribeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  showPlansButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  showPlansText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  plansContainer: {
    marginTop: 12,
    maxHeight: 500,
  },
  planCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardCurrent: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  currentBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  planPriceLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 4,
  },
  planFeature: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  planSelectButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  planSelectText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  infoContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
  subInfoText: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
});

export default SubscriptionManager;