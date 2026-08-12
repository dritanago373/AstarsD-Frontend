import React, { useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SubscriptionManager from './SubscriptionManager';

// Plan limits
const PLAN_LIMITS = {
  single: 1,
  pro: 5,
  business: 999,
};

const PLAN_PRICES = {
  single: 15,
  pro: 30,
  business: 50,
};

const PLAN_NAMES = {
  single: 'Single',
  pro: 'Pro',
  business: 'Business',
};

const SettingsScreen = ({
  visible,
  onClose,
  user,
  token,
  setUser,
  loading,
  setLoading,
  API_URL,
  fetchReviews,
  businesses = [],
  logout, 
}) => {
  // States
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [replyTone, setReplyTone] = useState('Professional');
  const [replyLength, setReplyLength] = useState('Medium');

  // Email change states
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Business name change states
  const [showChangeBusiness, setShowChangeBusiness] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [businessLoading, setBusinessLoading] = useState(false);

  // Password change states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Plan info
  const currentPlan = user?.plan || 'single';
  const maxBusinesses = PLAN_LIMITS[currentPlan] || 1;
  const currentPrice = PLAN_PRICES[currentPlan] || 15;
  const businessCount = businesses?.length || 0;
  const isAtLimit = businessCount >= maxBusinesses;
  const isMultiBusinessPlan = currentPlan === 'pro' || currentPlan === 'business';

  // ============================================
  // HANDLE CHANGE EMAIL
  // ============================================
  const handleChangeEmail = async () => {
    if (!newEmail || newEmail.trim() === '') {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setEmailLoading(true);
      const response = await fetch(`${API_URL}/user/change-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newEmail: newEmail.trim()
        })
      });
      const data = await response.json();

      if (data.success) {
        setPendingEmail(newEmail.trim());
        setShowChangeEmail(false);
        setShowVerifyEmail(true);
        Alert.alert('📧 Code Sent', `Verification code sent to ${newEmail.trim()}`);
        setNewEmail('');
      } else {
        Alert.alert('Error', data.message || 'Failed to send code');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // ============================================
  // HANDLE VERIFY NEW EMAIL
  // ============================================
  const handleVerifyNewEmail = async () => {
    if (!verificationCode || verificationCode.trim() === '') {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    try {
      setEmailLoading(true);
      const response = await fetch(`${API_URL}/user/verify-email-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newEmail: pendingEmail,
          code: verificationCode.trim()
        })
      });
      const data = await response.json();

      if (data.success) {
        setUser({
          ...user,
          email: pendingEmail,
          isVerified: true,
        });
        setShowVerifyEmail(false);
        setPendingEmail('');
        setVerificationCode('');
        Alert.alert('✅ Email Updated!', 'Your email has been changed successfully.');
      } else {
        Alert.alert('Error', data.message || 'Invalid verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // ============================================
  // HANDLE RESEND CODE
  // ============================================
  const handleResendCode = async () => {
    try {
      setEmailLoading(true);
      const response = await fetch(`${API_URL}/user/change-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newEmail: pendingEmail
        })
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert('📧 Code Sent', `A new code has been sent to ${pendingEmail}`);
      } else {
        Alert.alert('Error', data.message || 'Failed to send code');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // ============================================
  // HANDLE CHANGE BUSINESS NAME
  // ============================================
  const handleChangeBusinessName = async () => {
    if (!newBusinessName || newBusinessName.trim() === '') {
      Alert.alert('Error', 'Please enter a business name');
      return;
    }

    const plan = user?.plan || 'single';
    const requiresResubscription = plan === 'single';

    let message = '';
    if (requiresResubscription) {
      message = `Current: ${user?.businessName}
New: ${newBusinessName.trim()}

⚠️ IMPORTANT:
✅ "${user?.businessName}" keeps subscription (${user?.subscriptionDaysLeft || 0} days left)
❌ "${newBusinessName.trim()}" has NO subscription
💳 You must subscribe again for the new business

Are you sure?`;
    } else {
      message = `Current: ${user?.businessName}
New: ${newBusinessName.trim()}

✅ Your ${plan} plan allows multiple businesses.
✅ Subscription stays active.
✅ No extra payment needed.

Are you sure?`;
    }

    Alert.alert(
      requiresResubscription ? '⚠️ Change Business Name' : '🔄 Change Business Name',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              setBusinessLoading(true);

              const response = await fetch(`${API_URL}/user/business-name`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  businessName: newBusinessName.trim()
                })
              });
              const data = await response.json();

              if (data.success) {
                if (requiresResubscription) {
                  setUser({
                    ...user,
                    businessName: newBusinessName.trim(),
                    isSubscribed: false,
                    subscriptionId: null,
                  });

                  Alert.alert(
                    '✅ Business Name Changed!',
                    `Your business is now "${newBusinessName.trim()}".

📌 "${user?.businessName}" subscription: ✅ ACTIVE (${user?.subscriptionDaysLeft || 0} days left)
❌ "${newBusinessName.trim()}" subscription: NONE
💳 Subscribe now for the new business.`,
                    [
                      {
                        text: 'Subscribe Now',
                        onPress: () => setShowSubscriptionManager(true)
                      },
                      { text: 'Later' }
                    ]
                  );
                } else {
                  setUser({
                    ...user,
                    businessName: newBusinessName.trim(),
                    isSubscribed: true,
                  });

                  Alert.alert(
                    '✅ Business Name Changed!',
                    `Your business is now "${newBusinessName.trim()}".

✅ Subscription still active.
✅ No extra payment needed.`,
                    [{ text: 'Great!' }]
                  );
                }

                setShowChangeBusiness(false);
                setNewBusinessName('');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error. Try again.');
            } finally {
              setBusinessLoading(false);
            }
          }
        }
      ]
    );
  };

  // ============================================
  // HANDLE CHANGE PASSWORD
  // ============================================
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await fetch(`${API_URL}/user/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: oldPassword,
          newPassword: newPassword
        })
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert('✅ Success', 'Password updated successfully!');
        setShowChangePassword(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', data.message || 'Failed to update password');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ============================================
  // HANDLE UPGRADE
  // ============================================
  const handleUpgrade = async (newPlan) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/user/upgrade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: newPlan })
      });
      const data = await response.json();

      if (data.success) {
        setUser({ ...user, plan: newPlan });
        Alert.alert('✅ Upgraded!', `You are now on the ${PLAN_NAMES[newPlan]} plan.`);
      } else {
        Alert.alert('Error', data.message || 'Failed to upgrade');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* ============================================ */}
        {/* HEADER WITH "SETTINGS" WORD */}
        {/* ============================================ */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="settings-outline" size={24} color="#333" />
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-outline" size={28} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ============================================ */}
          {/* 👤 ACCOUNT SECTION */}
          {/* ============================================ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Account</Text>
            </View>
            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setShowChangeEmail(true)}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="mail-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Email</Text>
                </View>
                <View style={styles.clickableContainer}>
                  <Text style={styles.settingValue}>
                    {user?.email || 'N/A'}
                    {!user?.isVerified && (
                      <Text style={styles.unverifiedBadge}> ⚠️ Unverified</Text>
                    )}
                  </Text>
                  <Ionicons name="chevron-forward-outline" size={16} color="#ccc" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setShowChangeBusiness(true)}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="business-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Business</Text>
                </View>
                <View style={styles.clickableContainer}>
                  <Text style={styles.settingValue}>{user?.businessName || 'N/A'}</Text>
                  <Ionicons name="chevron-forward-outline" size={16} color="#ccc" />
                </View>
              </TouchableOpacity>
               <TouchableOpacity
                 style={styles.settingItem}
                 onPress={() => {
                   Alert.alert(
                     'Logout',
                     'Are you sure you want to logout?',
                     [
                       { text: 'Cancel', style: 'cancel' },
                       {
                         text: 'Logout',
                         style: 'destructive',
                         onPress: () => {
                           logout();                 // Call the logout function from App.js
                           onClose();                // Close the Settings modal
                     }
                    }
                   ]
                  );
               }}
              >
               <View style={styles.settingLeft}>
                 <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
                 <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>Logout</Text>
               </View>
               <Ionicons name="chevron-forward-outline" size={16} color="#ccc" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowChangePassword(true)}
              >
                <Ionicons name="key-outline" size={18} color="#007AFF" />
                <Text style={styles.actionButtonText}>Change Password</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ============================================ */}
          {/* ⚙️ PREFERENCES SECTION */}
          {/* ============================================ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="options-outline" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Preferences</Text>
            </View>
            <View style={styles.sectionContent}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="notifications-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Notifications</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: '#767577', true: '#34C759' }}
                  thumbColor={notifications ? '#fff' : '#f4f3f4'}
                />
              </View>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="moon-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#767577', true: '#34C759' }}
                  thumbColor={darkMode ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          {/* ============================================ */}
          {/* 🤖 AI REPLY SETTINGS SECTION */}
          {/* ============================================ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubbles-outline" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>AI Reply Settings</Text>
            </View>
            <View style={styles.sectionContent}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="happy-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Tone</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const tones = ['Professional', 'Casual', 'Friendly', 'Formal'];
                    const currentIndex = tones.indexOf(replyTone);
                    const nextIndex = (currentIndex + 1) % tones.length;
                    setReplyTone(tones[nextIndex]);
                  }}
                >
                  <View style={styles.settingValueContainer}>
                    <Text style={styles.settingValue}>{replyTone}</Text>
                    <Ionicons name="chevron-forward-outline" size={16} color="#ccc" />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="text-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Length</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const lengths = ['Short', 'Medium', 'Detailed'];
                    const currentIndex = lengths.indexOf(replyLength);
                    const nextIndex = (currentIndex + 1) % lengths.length;
                    setReplyLength(lengths[nextIndex]);
                  }}
                >
                  <View style={styles.settingValueContainer}>
                    <Text style={styles.settingValue}>{replyLength}</Text>
                    <Ionicons name="chevron-forward-outline" size={16} color="#ccc" />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="globe-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Auto-Detect Language</Text>
                </View>
                <View style={styles.badgeContainer}>
                  <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                  <Text style={styles.badgeText}>Enabled</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ============================================ */}
          {/* 🆘 SUPPORT SECTION */}
          {/* ============================================ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Support</Text>
            </View>
            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => Alert.alert('Help Center', 'FAQ and guides coming soon!')}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="book-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Help Center</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color="#ccc" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => Alert.alert('Contact Support', 'support@balkanai.com')}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="mail-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Contact Support</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color="#ccc" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ============================================ */}
          {/* ℹ️ APP INFO SECTION */}
          {/* ============================================ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>App Info</Text>
            </View>
            <View style={styles.sectionContent}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="code-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Version</Text>
                </View>
                <Text style={styles.settingValue}>1.0.0</Text>
              </View>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => Alert.alert('Privacy Policy', 'https://balkanai.com/privacy')}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="lock-closed-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Privacy Policy</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color="#ccc" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => Alert.alert('Terms of Service', 'https://balkanai.com/terms')}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="document-text-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Terms of Service</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color="#ccc" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ============================================ */}
          {/* 📌 SUBSCRIPTION MANAGEMENT (MOVED TO BOTTOM) */}
          {/* ============================================ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Subscription</Text>
            </View>
            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => setShowSubscriptionManager(!showSubscriptionManager)}
              >
                <Ionicons name="settings-outline" size={18} color="#007AFF" />
                <Text style={styles.manageButtonText}>
                  {showSubscriptionManager ? 'Hide' : 'Manage Subscription'}
                </Text>
              </TouchableOpacity>

              {showSubscriptionManager && (
                <View style={styles.subscriptionContainer}>
                  <SubscriptionManager
                    user={user}
                    token={token}
                    setUser={setUser}
                    loading={loading}
                    setLoading={setLoading}
                    API_URL={API_URL}
                  />
                </View>
              )}
            </View>
          </View>

          {/* ============================================ */}
          {/* 💳 PLAN & BILLING (MOVED TO BOTTOM) */}
          {/* ============================================ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Plan & Billing</Text>
            </View>
            <View style={styles.sectionContent}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Current Plan</Text>
                </View>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{PLAN_NAMES[currentPlan]}</Text>
                </View>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="cash-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Price</Text>
                </View>
                <Text style={styles.settingValue}>${currentPrice}/mo</Text>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="business-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Businesses</Text>
                </View>
                <Text style={[styles.settingValue, isAtLimit && styles.warningText]}>
                  {businessCount} / {maxBusinesses === 999 ? '∞' : maxBusinesses} used
                </Text>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="chatbubbles-outline" size={18} color="#666" />
                  <Text style={styles.settingLabel}>Replies</Text>
                </View>
                <Text style={[styles.settingValue, styles.activeText]}>Unlimited ✅</Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((businessCount / maxBusinesses) * 100, 100)}%`,
                      backgroundColor: isAtLimit ? '#FF3B30' : '#34C759'
                    }
                  ]} />
                </View>
                <Text style={styles.progressText}>
                  {isAtLimit ? '⚠️ Limit reached' : `${businessCount} of ${maxBusinesses === 999 ? 'unlimited' : maxBusinesses} businesses`}
                </Text>
              </View>

              {/* Quick Upgrade Button (if not on Business) */}
              {currentPlan !== 'business' && (
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => {
                    Alert.alert(
                      '🚀 Upgrade Plan',
                      'Choose a plan with more businesses:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Pro ($30/mo - 5 businesses)',
                          onPress: () => handleUpgrade('pro')
                        },
                        {
                          text: 'Business ($50/mo - Unlimited)',
                          onPress: () => handleUpgrade('business')
                        }
                      ]
                    );
                  }}
                >
                  <Ionicons name="rocket-outline" size={18} color="#fff" />
                  <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ============================================ */}
          {/* REFRESH BUTTON */}
          {/* ============================================ */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              fetchReviews();
              Alert.alert('✅ Refreshed', 'Data updated successfully!');
            }}
          >
            <Ionicons name="refresh-outline" size={20} color="#007AFF" />
            <Text style={styles.refreshButtonText}>Refresh Data</Text>
          </TouchableOpacity>

          <View style={styles.footer} />
        </ScrollView>
      </SafeAreaView>

      {/* ============================================ */}
      {/* MODALS (unchanged) */}
      {/* ============================================ */}
      {/* Change Email Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showChangeEmail}
        onRequestClose={() => {
          setShowChangeEmail(false);
          setNewEmail('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📧 Change Email</Text>
            <Text style={styles.modalSubtitle}>Current: {user?.email}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter new email address"
              placeholderTextColor="#999"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus={true}
            />
            <Text style={styles.warningNote}>
              ⚠️ A verification code will be sent to your new email.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowChangeEmail(false);
                  setNewEmail('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleChangeEmail}
                disabled={emailLoading || !newEmail.trim()}
              >
                <Text style={styles.modalSaveButtonText}>
                  {emailLoading ? 'Sending...' : 'Send Code'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verify Email Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showVerifyEmail}
        onRequestClose={() => {
          setShowVerifyEmail(false);
          setVerificationCode('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📧 Verify New Email</Text>
            <Text style={styles.modalSubtitle}>
              We sent a code to:{'\n'}
              <Text style={styles.modalEmail}>{pendingEmail}</Text>
            </Text>
            <TextInput
              style={[styles.modalInput, styles.codeInput]}
              placeholder="Enter verification code"
              placeholderTextColor="#999"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={styles.resendCodeButton}
              onPress={handleResendCode}
              disabled={emailLoading}
            >
              <Text style={styles.resendCodeText}>Resend Code</Text>
            </TouchableOpacity>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowVerifyEmail(false);
                  setVerificationCode('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleVerifyNewEmail}
                disabled={emailLoading || !verificationCode.trim()}
              >
                <Text style={styles.modalSaveButtonText}>
                  {emailLoading ? 'Verifying...' : 'Verify'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Business Name Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showChangeBusiness}
        onRequestClose={() => {
          setShowChangeBusiness(false);
          setNewBusinessName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🏢 Change Business Name</Text>
            <Text style={styles.modalSubtitle}>Current: {user?.businessName}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter new business name"
              placeholderTextColor="#999"
              value={newBusinessName}
              onChangeText={setNewBusinessName}
              autoFocus={true}
            />
            <Text style={styles.warningNote}>
              {currentPlan === 'single'
                ? '⚠️ You will need to subscribe again for the new business.'
                : `✅ Your ${currentPlan} plan allows business name changes. No extra payment needed.`}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowChangeBusiness(false);
                  setNewBusinessName('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleChangeBusinessName}
                disabled={businessLoading || !newBusinessName.trim()}
              >
                <Text style={styles.modalSaveButtonText}>
                  {businessLoading ? 'Changing...' : 'Change'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showChangePassword}
        onRequestClose={() => {
          setShowChangePassword(false);
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔑 Change Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Current Password"
              placeholderTextColor="#999"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.modalInput}
              placeholder="New Password (min 6 characters)"
              placeholderTextColor="#999"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm New Password"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowChangePassword(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                <Text style={styles.modalSaveButtonText}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontSize: 15,
    color: '#333',
  },
  settingValue: {
    fontSize: 15,
    color: '#666',
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeText: {
    color: '#34C759',
    fontWeight: '600',
  },
  warningText: {
    color: '#FF9500',
    fontWeight: '600',
  },
  planBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  clickableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unverifiedBadge: {
    color: '#FF9500',
    fontSize: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
  progressContainer: {
    marginVertical: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  manageButton: {
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  manageButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  subscriptionContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 8,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    height: 40,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalEmail: {
    fontWeight: 'bold',
    color: '#333',
  },
  modalInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f0f0f0',
  },
  modalCancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  modalSaveButton: {
    backgroundColor: '#007AFF',
  },
  modalSaveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  warningNote: {
    fontSize: 14,
    color: '#FF9500',
    textAlign: 'center',
    marginVertical: 12,
  },
  resendCodeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendCodeText: {
    color: '#007AFF',
    fontSize: 14,
  },
};

export default SettingsScreen;