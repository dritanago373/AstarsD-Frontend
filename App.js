import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SettingsScreen from './components/SettingsScreen';

// ⚠️ CHANGE THIS TO YOUR BACKEND IP + PORT
const API_URL = 'http://10.0.0.157:5000/api';

// All supported languages
const SUPPORTED_LANGUAGES = {
  'en-US': { name: 'English (US)', flag: '🇺🇸' },
  'en-GB': { name: 'English (UK)', flag: '🇬🇧' },
  'it': { name: 'Italiano', flag: '🇮🇹' },
  'de': { name: 'Deutsch', flag: '🇩🇪' },
  'fr': { name: 'Français', flag: '🇫🇷' },
  'es': { name: 'Español', flag: '🇪🇸' },
  'sq': { name: 'Shqip', flag: '🇦🇱' },
  'bs': { name: 'Bosanski', flag: '🇧🇦' },
  'hr': { name: 'Hrvatski', flag: '🇭🇷' },
  'sr': { name: 'Srpski', flag: '🇷🇸' },
  'mk': { name: 'Македонски', flag: '🇲🇰' },
};

const App = () => {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [syncingBusinessId, setSyncingBusinessId] = useState(null);

  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  // Edit Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editReplyId, setEditReplyId] = useState(null);
  const [editReplyContent, setEditReplyContent] = useState('');

  // Add Business Modal states
  const [addBusinessModalVisible, setAddBusinessModalVisible] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessPlatform, setNewBusinessPlatform] = useState('google');
  const [newBusinessExternalId, setNewBusinessExternalId] = useState('');

  // Language selection for each review (stored locally)
  const [reviewLanguages, setReviewLanguages] = useState({});

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
        await Promise.all([
          fetchReviews(savedToken),
          fetchBusinesses(savedToken)
        ]);
      }
    } catch (error) {
      console.error('Error loading token:', error);
    }
  };

  const fetchBusinesses = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/businesses`, {
        headers: { Authorization: `Bearer ${authToken || token}` }
      });
      const data = await response.json();
      if (data.success) {
        setBusinesses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const addBusiness = async () => {
    if (!newBusinessName.trim()) {
      Alert.alert('Error', 'Please enter a business name');
      return;
    }

    if (!newBusinessExternalId.trim()) {
      Alert.alert('Error', 'Please enter the external ID');
      return;
    }

    const plan = user?.plan || 'single';
    const limit = plan === 'pro' ? 5 : plan === 'business' ? Infinity : 1;
    if (businesses.length >= limit) {
      Alert.alert('Limit Reached', `Your ${plan} plan allows a maximum of ${limit === Infinity ? 'unlimited' : limit} businesses.`);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/businesses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newBusinessName.trim(),
          platform: newBusinessPlatform,
          externalId: newBusinessExternalId.trim(),
          accessToken: ''
        })
      });
      const data = await response.json();
      if (data.success) {
        await fetchBusinesses(token);
        setNewBusinessName('');
        setNewBusinessExternalId('');
        setAddBusinessModalVisible(false);
        Alert.alert('Success', 'Business added! You can now sync reviews.');
      } else {
        Alert.alert('Error', data.message || 'Failed to add business');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const syncBusiness = async (businessId) => {
    try {
      setSyncingBusinessId(businessId);
      setLoading(true);
      
      const response = await fetch(`${API_URL}/businesses/${businessId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        Alert.alert(
          'Sync Complete', 
          `${data.data?.newReviews || 0} new reviews found and processed.`
        );
        await Promise.all([
          fetchReviews(token),
          fetchBusinesses(token)
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to sync reviews');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
      setSyncingBusinessId(null);
    }
  };

  const register = async () => {
    if (!email || !password || !businessName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, businessName })
      });
      const data = await response.json();

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem('token', data.token);
        await Promise.all([
          fetchReviews(data.token),
          fetchBusinesses(data.token)
        ]);
        Alert.alert('Success', 'Account created! 14-day free trial started.');
      } else {
        Alert.alert('Error', data.message || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem('token', data.token);
        await Promise.all([
          fetchReviews(data.token),
          fetchBusinesses(data.token)
        ]);
        Alert.alert('Success', 'Welcome back!');
      } else {
        Alert.alert('Error', data.message || 'Login failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setToken('');
    setUser(null);
    setReviews([]);
    setBusinesses([]);
    await AsyncStorage.removeItem('token');
  };

  const fetchReviews = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/reviews/pending`, {
        headers: { Authorization: `Bearer ${authToken || token}` }
      });
      const data = await response.json();
      if (data.success) {
        setReviews(data.data || []);
        const langState = {};
        data.data.forEach(review => {
          if (review.reply) {
            langState[review.reply.id] = review.reply.language || 'en-US';
          }
        });
        setReviewLanguages(langState);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const approveReply = async (replyId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/replies/${replyId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Reply approved and sent!');
        fetchReviews();
      } else {
        Alert.alert('Error', data.message || 'Failed to approve reply');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (replyId, currentDraft) => {
    setEditReplyId(replyId);
    setEditReplyContent(currentDraft);
    setEditModalVisible(true);
  };

  const saveEditedReply = async () => {
    if (!editReplyContent || editReplyContent.trim() === '') {
      Alert.alert('Error', 'Reply cannot be empty');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/replies/${editReplyId}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: editReplyContent })
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Reply updated!');
        setEditModalVisible(false);
        setEditReplyId(null);
        setEditReplyContent('');
        fetchReviews();
      } else {
        Alert.alert('Error', data.message || 'Failed to update reply');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const rejectReply = async (replyId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/replies/${replyId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert('Rejected', 'Reply has been rejected.');
        fetchReviews();
      } else {
        Alert.alert('Error', data.message || 'Failed to reject reply');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const regenerateReply = async (replyId, language) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/replies/${replyId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ language: language || 'en-US' })
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', `New reply generated!`);
        setReviewLanguages(prev => ({
          ...prev,
          [replyId]: language || 'en-US'
        }));
        fetchReviews();
      } else {
        Alert.alert('Error', data.message || 'Failed to regenerate reply');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const computeAverageRating = () => {
    if (!reviews || reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    return total / reviews.length;
  };

  const renderStars = (ratingValue) => {
    const full = Math.floor(ratingValue);
    const half = ratingValue - full >= 0.5;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < full) {
        stars.push(<Ionicons key={i} name="star" size={20} color="#FFD700" />);
      } else if (i === full && half) {
        stars.push(<Ionicons key={i} name="star-half" size={20} color="#FFD700" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={20} color="#FFD700" />);
      }
    }
    return stars;
  };

  const canAddBusiness = () => {
    const plan = user?.plan || 'single';
    if (plan === 'single') return false;
    const limit = plan === 'pro' ? 5 : Infinity;
    return businesses.length < limit;
  };

  const getBusinessLimitText = () => {
    const plan = user?.plan || 'single';
    if (plan === 'pro') {
      return `${businesses.length} / 5 businesses used`;
    } else if (plan === 'business') {
      return `Unlimited (${businesses.length} added)`;
    }
    return '';
  };

  const getFraudIndicator = (review) => {
    if (review.isFake) {
      return {
        color: '#CC4444',
        label: 'Potential Fake Review',
        score: review.fraudScore || 0
      };
    }
    if (review.fraudScore && review.fraudScore > 20) {
      return {
        color: '#CC8844',
        label: 'Suspicious (Score: ' + review.fraudScore + ')',
        score: review.fraudScore
      };
    }
    return null;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchReviews(token),
      fetchBusinesses(token)
    ]);
    setRefreshing(false);
  };

  // ================================================================
  // LOGIN SCREEN
  // ================================================================
  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.authContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.starsContainer}>
              <Ionicons name="star" size={28} color="#D4AF37" />
              <Ionicons name="star" size={28} color="#D4AF37" />
              <Ionicons name="star" size={28} color="#D4AF37" />
              <Ionicons name="star" size={28} color="#D4AF37" />
              <Ionicons name="star" size={28} color="#D4AF37" />
            </View>

            <Text style={styles.title}>Balkan AI Reply</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Welcome Back' : 'Start Your 14-Day Free Trial'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Business Name"
                placeholderTextColor="#888"
                value={businessName}
                onChangeText={setBusinessName}
              />
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={isLogin ? login : register}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.link}>
                {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ================================================================
  // MAIN APP
  // ================================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Reply</Text>
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings-outline" size={22} color="#2A3A4A" />
        </TouchableOpacity>
      </View>

      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.businessName}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.trialText}>
              {user.trialEnds && new Date(user.trialEnds) > new Date()
                ? `Trial: ${Math.ceil((new Date(user.trialEnds) - new Date()) / (1000 * 60 * 60 * 24))} days left`
                : 'Trial expired'}
            </Text>
            <Text style={styles.usageText}>{user.repliesUsed || 0}/50 replies used</Text>
          </View>
        </View>
      )}

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Rating Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Rating</Text>
          <View style={styles.ratingSummary}>
            <View style={styles.starsRow}>
              {renderStars(computeAverageRating())}
            </View>
            <Text style={styles.ratingValue}>
              {computeAverageRating().toFixed(1)} / 5
            </Text>
            <Text style={styles.ratingTotal}>
              Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Businesses Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Businesses</Text>
          {businesses.length === 0 ? (
            <View>
              <Text style={styles.emptyText}>No businesses added yet.</Text>
              <Text style={styles.helperText}>
                {user?.plan === 'single' 
                  ? 'Upgrade to Pro or Business to add multiple businesses.'
                  : 'Add your first business to start syncing reviews.'}
              </Text>
            </View>
          ) : (
            businesses.map((biz, idx) => (
              <View key={biz._id || idx} style={styles.businessItem}>
                <View style={styles.businessRow}>
                  <View style={styles.businessInfo}>
                    <Text style={styles.businessName}>{biz.name}</Text>
                    <Text style={styles.businessMeta}>
                      {biz.platform || 'other'} • {biz.externalId || 'No external ID'}
                    </Text>
                    {biz.lastSyncedAt && (
                      <Text style={styles.businessMeta}>
                        Last synced: {new Date(biz.lastSyncedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.syncButton,
                      syncingBusinessId === biz._id && styles.syncButtonDisabled
                    ]}
                    onPress={() => syncBusiness(biz._id)}
                    disabled={syncingBusinessId === biz._id || loading}
                  >
                    <Ionicons 
                      name={syncingBusinessId === biz._id ? "sync" : "download-outline"} 
                      size={18} 
                      color="#fff" 
                    />
                    <Text style={styles.syncButtonText}>
                      {syncingBusinessId === biz._id ? 'Syncing...' : 'Sync'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <View style={styles.addBusinessContainer}>
            <TouchableOpacity
              style={[
                styles.addBusinessButton,
                !canAddBusiness() && styles.addBusinessButtonDisabled
              ]}
              onPress={() => setAddBusinessModalVisible(true)}
              disabled={!canAddBusiness()}
            >
              <Ionicons name="add-outline" size={20} color="#fff" />
              <Text style={styles.addBusinessButtonText}>
                {canAddBusiness() ? 'Add Business' : 'Upgrade to add more'}
              </Text>
            </TouchableOpacity>
            {user?.plan !== 'single' && (
              <Text style={styles.businessLimitText}>
                {getBusinessLimitText()}
              </Text>
            )}
          </View>
        </View>

        {/* Pending Reviews */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending Reviews ({reviews.length})</Text>

          {reviews.length === 0 ? (
            <View>
              <Text style={styles.emptyText}>No pending reviews</Text>
              <Text style={styles.helperText}>
                Click "Sync" on your businesses above to fetch new reviews.
              </Text>
            </View>
          ) : (
            reviews.map((review) => {
              const fraudIndicator = getFraudIndicator(review);
              const replyId = review.reply?.id;
              const currentLanguage = reviewLanguages[replyId] || review.reply?.language || 'en-US';
              
              return (
                <View key={review._id} style={styles.reviewCard}>
                  {/* Business Badge */}
                  {review.business && (
                    <View style={styles.businessBadge}>
                      <Ionicons name="business-outline" size={14} color="#2A3A4A" />
                      <Text style={styles.businessBadgeText}>
                        {review.business.name || 'Unnamed Business'}
                      </Text>
                    </View>
                  )}

                  {/* Fraud Indicator */}
                  {fraudIndicator && (
                    <View style={[styles.fraudBadge, { backgroundColor: fraudIndicator.color + '15' }]}>
                      <Text style={[styles.fraudText, { color: fraudIndicator.color }]}>
                        {fraudIndicator.label}
                      </Text>
                    </View>
                  )}

                  {/* Detected Language Badge */}
                  <View style={styles.detectedLanguageBadge}>
                    <Ionicons name="language-outline" size={14} color="#2A3A4A" />
                    <Text style={styles.detectedLanguageText}>
                      Language: {SUPPORTED_LANGUAGES[review.contentLanguage]?.flag || '🌐'} {SUPPORTED_LANGUAGES[review.contentLanguage]?.name || review.contentLanguage || 'English (US)'}
                    </Text>
                  </View>

                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.reviewerName || 'Anonymous'}</Text>
                    <Text style={styles.ratingText}>{'⭐'.repeat(review.rating)}</Text>
                  </View>

                  <Text style={styles.reviewContent}>{review.content}</Text>

                  {review.reply && (
                    <View style={styles.replyContainer}>
                      <Text style={styles.replyLabel}>AI Draft:</Text>
                      <Text style={styles.replyText}>{review.reply.draft}</Text>
                      
                      {/* Language Selector */}
                      <View style={styles.languageSelector}>
                        <Text style={styles.languageLabel}>Reply Language:</Text>
                        <Picker
                          selectedValue={currentLanguage}
                          style={styles.languagePicker}
                          onValueChange={(itemValue) => {
                            setReviewLanguages(prev => ({
                              ...prev,
                              [replyId]: itemValue
                            }));
                            regenerateReply(replyId, itemValue);
                          }}
                          enabled={!loading}
                          dropdownIconColor="#2A3A4A"
                        >
                          <Picker.Item label="🇺🇸 English (US)" value="en-US" />
                          <Picker.Item label="🇬🇧 English (UK)" value="en-GB" />
                          <Picker.Item label="🇮🇹 Italiano" value="it" />
                          <Picker.Item label="🇩🇪 Deutsch" value="de" />
                          <Picker.Item label="🇫🇷 Français" value="fr" />
                          <Picker.Item label="🇪🇸 Español" value="es" />
                          <Picker.Item label="🇦🇱 Shqip" value="sq" />
                          <Picker.Item label="🇧🇦 Bosanski" value="bs" />
                          <Picker.Item label="🇭🇷 Hrvatski" value="hr" />
                          <Picker.Item label="🇷🇸 Srpski" value="sr" />
                          <Picker.Item label="🇲🇰 Македонски" value="mk" />
                        </Picker>
                      </View>

                      <View style={styles.replyActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton]}
                          onPress={() => approveReply(replyId)}
                          disabled={loading}
                        >
                          <Ionicons name="checkmark-outline" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, styles.editButton]}
                          onPress={() => openEditModal(replyId, review.reply.draft)}
                          disabled={loading}
                        >
                          <Ionicons name="create-outline" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, styles.regenerateButton]}
                          onPress={() => regenerateReply(replyId, currentLanguage)}
                          disabled={loading}
                        >
                          <Ionicons name="refresh-outline" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Regenerate</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, styles.rejectButton]}
                          onPress={() => rejectReply(replyId)}
                          disabled={loading}
                        >
                          <Ionicons name="close-outline" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Reply</Text>
            <TextInput
              style={styles.modalInput}
              value={editReplyContent}
              onChangeText={setEditReplyContent}
              multiline
              numberOfLines={6}
              placeholder="Edit the AI reply..."
              placeholderTextColor="#888"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditReplyId(null);
                  setEditReplyContent('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#2A3A4A' }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={saveEditedReply}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Business Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addBusinessModalVisible}
        onRequestClose={() => {
          setAddBusinessModalVisible(false);
          setNewBusinessName('');
          setNewBusinessPlatform('google');
          setNewBusinessExternalId('');
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => Keyboard.dismiss()}
          >
            <View style={styles.modalContent}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={styles.modalTitle}>Add Business</Text>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Business Name *"
                  placeholderTextColor="#888"
                  value={newBusinessName}
                  onChangeText={setNewBusinessName}
                  autoFocus
                  returnKeyType="next"
                />

                <View style={styles.platformSelector}>
                  <Text style={styles.label}>Platform:</Text>
                  <View style={styles.platformButtons}>
                    {['google', 'facebook', 'yelp', 'other'].map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.platformButton,
                          newBusinessPlatform === p && styles.platformButtonActive
                        ]}
                        onPress={() => setNewBusinessPlatform(p)}
                      >
                        <Text style={[
                          styles.platformButtonText,
                          newBusinessPlatform === p && styles.platformButtonTextActive
                        ]}>
                          {p === 'google' ? 'Google' : 
                           p === 'facebook' ? 'Facebook' : 
                           p === 'yelp' ? 'Yelp' : 'Other'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="External ID (Place ID, Page ID, etc.) *"
                  placeholderTextColor="#888"
                  value={newBusinessExternalId}
                  onChangeText={setNewBusinessExternalId}
                  returnKeyType="done"
                  onSubmitEditing={addBusiness}
                />

                <View style={styles.helperBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#2A3A4A" />
                  <Text style={styles.helperTextSmall}>
                    You'll need to get this ID from the platform's developer console.
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => {
                      setAddBusinessModalVisible(false);
                      setNewBusinessName('');
                      setNewBusinessPlatform('google');
                      setNewBusinessExternalId('');
                      Keyboard.dismiss();
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: '#2A3A4A' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalSaveButton]}
                    onPress={addBusiness}
                    disabled={loading}
                  >
                    <Text style={styles.modalButtonText}>
                      {loading ? 'Adding...' : 'Add Business'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings Screen */}
      <SettingsScreen
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        token={token}
        setUser={setUser}
        loading={loading}
        setLoading={setLoading}
        API_URL={API_URL}
        fetchReviews={fetchReviews}
        businesses={businesses}
        logout={logout}
      />
    </SafeAreaView>
  );
};

// ================================================================
// STYLES - PROFESSIONAL DARK UI
// ================================================================
const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F2F4F8',
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
    backgroundColor: '#F2F4F8',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    color: '#1A2A3A',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
    color: '#6A7A8A',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D0D7DE',
    fontSize: 15,
    color: '#1A2A3A',
  },
  button: {
    backgroundColor: '#1A2A3A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  link: {
    color: '#4A6FA5',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2A3A',
    letterSpacing: 0.3,
  },
  settingsButton: {
    padding: 4,
  },
  userInfo: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF0',
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A2A3A',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  trialText: {
    color: '#2C7A3E',
    fontSize: 13,
  },
  usageText: {
    color: '#6A7A8A',
    fontSize: 13,
  },
  card: {
    margin: 14,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2A3A',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 14,
    marginRight: 8,
    color: '#1A2A3A',
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: '#E8ECF0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewerName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1A2A3A',
  },
  ratingText: {
    fontSize: 14,
  },
  reviewContent: {
    color: '#2A3A4A',
    marginBottom: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  replyContainer: {
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  replyLabel: {
    fontWeight: '600',
    color: '#4A6FA5',
    marginBottom: 4,
    fontSize: 13,
  },
  replyText: {
    fontSize: 14,
    color: '#1A2A3A',
    marginBottom: 6,
    lineHeight: 20,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0D7DE',
    paddingHorizontal: 4,
  },
  languageLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A2A3A',
    paddingHorizontal: 8,
  },
  languagePicker: {
    flex: 1,
    height: 36,
  },
  detectedLanguageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8ECF0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  detectedLanguageText: {
    fontSize: 11,
    color: '#4A5A6A',
    fontWeight: '500',
    marginLeft: 4,
  },
  replyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 4,
    flex: 1,
    minWidth: 60,
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#2C7A3E',
  },
  editButton: {
    backgroundColor: '#6A7A8A',
  },
  regenerateButton: {
    backgroundColor: '#4A6FA5',
  },
  rejectButton: {
    backgroundColor: '#7A4A4A',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6A7A8A',
    padding: 10,
  },
  helperText: {
    textAlign: 'center',
    color: '#8A9AAB',
    fontSize: 13,
    paddingBottom: 10,
  },
  helperTextSmall: {
    textAlign: 'center',
    color: '#8A9AAB',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 12,
  },
  ratingSummary: {
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A2A3A',
  },
  ratingTotal: {
    fontSize: 13,
    color: '#6A7A8A',
    marginTop: 2,
  },
  businessItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF0',
  },
  businessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2A3A',
  },
  businessMeta: {
    fontSize: 12,
    color: '#8A9AAB',
    marginTop: 2,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8ECF0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  businessBadgeText: {
    fontSize: 12,
    color: '#4A5A6A',
    fontWeight: '500',
    marginLeft: 4,
  },
  fraudBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  fraudText: {
    fontSize: 11,
    fontWeight: '500',
  },
  addBusinessContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  addBusinessButton: {
    backgroundColor: '#1A2A3A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 6,
    width: '100%',
  },
  addBusinessButtonDisabled: {
    backgroundColor: '#B0B8C0',
  },
  addBusinessButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  businessLimitText: {
    fontSize: 13,
    color: '#6A7A8A',
    marginTop: 8,
  },
  syncButton: {
    backgroundColor: '#4A6FA5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
  syncButtonDisabled: {
    backgroundColor: '#B0B8C0',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 13,
    marginLeft: 6,
  },
  platformSelector: {
    marginVertical: 10,
  },
  platformButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  platformButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D0D7DE',
    backgroundColor: '#FFFFFF',
  },
  platformButtonActive: {
    backgroundColor: '#1A2A3A',
    borderColor: '#1A2A3A',
  },
  platformButtonText: {
    fontSize: 12,
    color: '#1A2A3A',
  },
  platformButtonTextActive: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1A2A3A',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D0D7DE',
    borderRadius: 6,
    padding: 12,
    fontSize: 15,
    minHeight: 46,
    textAlignVertical: 'top',
    color: '#1A2A3A',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#E8ECF0',
  },
  modalSaveButton: {
    backgroundColor: '#1A2A3A',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  helperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 10,
    borderRadius: 6,
    marginVertical: 6,
    gap: 8,
  },
};

export default App;