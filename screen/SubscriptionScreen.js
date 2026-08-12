import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Make sure to install this

const SubscriptionScreen = () => {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Get the JWT token from your login storage
  const getToken = async () => {
    return await AsyncStorage.getItem('token'); // Change this to your storage key
  };

  const fetchData = async () => {
  try {
    const token = await getToken();
    if (!token) {
      setError('Please login first');
      setLoading(false);
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // === YOUR IP 10.0.0.157 IS NOW HARDCODED HERE ===
    const statusRes = await fetch('http://10.0.0.157:5000/api/user/status', { headers });
    const statusData = await statusRes.json();

    if (!statusData.success) throw new Error(statusData.message || 'Failed to fetch status');

    const historyRes = await fetch('http://10.0.0.157:5000/api/reviews/history', { headers });
    const historyData = await historyRes.json();

    setSubscriptionData(statusData.data);
    setReviews(historyData.data || []);
    setLoading(false);
  } catch (err) {
    setError(err.message);
    setLoading(false);
  }
};

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading your subscription...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'red', textAlign: 'center' }}>Error: {error}</Text>
        <Text style={{ marginTop: 10, color: '#666' }}>Make sure backend is running on port 5000</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* === SUBSCRIPTION CARD (Top) === */}
      <View style={styles.card}>
        <Text style={styles.planTitle}>
          {subscriptionData?.isSubscribed ? '⭐ Premium' : '📋 Free Trial'}
        </Text>
        <Text style={styles.planDetail}>
          Plan: {subscriptionData?.plan || 'Single'}
        </Text>
        <Text style={styles.planDetail}>
          {subscriptionData?.isSubscribed 
            ? `Expires: ${subscriptionData?.subscriptionDaysLeft || 0} days left`
            : `Trial: ${subscriptionData?.trialDaysLeft || 0} days left`
          }
        </Text>
        <View style={styles.usageRow}>
          <Text style={styles.usageText}>
            Replies Used: {subscriptionData?.repliesUsed || 0} / {subscriptionData?.monthlyLimit || 50}
          </Text>
        </View>
      </View>

      {/* === TABLE / LIST OF REVIEWS (Matches your Windows screenshot) === */}
      <Text style={styles.sectionHeader}>Recent Reviews</Text>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No reviews yet. Add one!</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.reviewerName || 'Anonymous'}
              </Text>
              <Text style={styles.itemStatus}>
                Status: {item.status || 'Pending'}
              </Text>
              <Text style={styles.itemDate}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              <Text style={styles.itemRating}>
                {'⭐'.repeat(Math.round(item.rating || 0))}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  planTitle: { fontSize: 22, fontWeight: 'bold', color: '#007AFF' },
  planDetail: { fontSize: 16, color: '#333', marginTop: 4 },
  usageRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  usageText: { fontSize: 14, fontWeight: '600', color: '#555' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  row: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rowContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '500', flex: 2 },
  itemStatus: { fontSize: 14, color: '#666', flex: 1, textAlign: 'center' },
  itemDate: { fontSize: 12, color: '#999', flex: 1, textAlign: 'right' },
  itemRating: { fontSize: 14, marginLeft: 10 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#999' },
});

export default SubscriptionScreen;