import { useState, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useSettings = () => {
  const [settings, setSettings] = useState({
    currency: 'USD',
    show_tax_bifurcation: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      AUD: 'A$',
      CAD: 'C$',
      JPY: '¥',
      CNY: '¥'
    };
    return symbols[currency] || '$';
  };

  const formatCurrency = (amount) => {
    const symbol = getCurrencySymbol(settings.currency);
    return `${symbol}${parseFloat(amount).toFixed(2)}`;
  };

  return { settings, loading, getCurrencySymbol, formatCurrency, refreshSettings: fetchSettings };
};
