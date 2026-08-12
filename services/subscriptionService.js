// services/subscriptionService.js
const API_URL = 'http://10.0.0.157:5000/api';

export const subscriptionService = {
  // Get subscription status
  getStatus: async (token) => {
    try {
      const response = await fetch(`${API_URL}/user/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      throw error;
    }
  },

  // Subscribe user
  subscribe: async (token, planId = 'monthly') => {
    try {
      const response = await fetch(`${API_URL}/user/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error subscribing:', error);
      throw error;
    }
  },

  // Unsubscribe user
  unsubscribe: async (token) => {
    try {
      const response = await fetch(`${API_URL}/user/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      throw error;
    }
  },

  // Get available plans
  getPlans: async () => {
    try {
      const response = await fetch(`${API_URL}/plans`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  }
};