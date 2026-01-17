import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, {
        currency: settings.currency,
        show_tax_bifurcation: settings.show_tax_bifurcation
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-full" data-testid="settings-unauthorized">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">Only administrators can access settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings-page">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900" data-testid="settings-title">
          Settings
        </h1>
        <p className="text-slate-600 mt-1">Manage application settings</p>
      </div>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>Choose the currency to display throughout the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select 
              value={settings?.currency} 
              onValueChange={(value) => setSettings({ ...settings, currency: value })}
            >
              <SelectTrigger id="currency" data-testid="currency-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
                <SelectItem value="AUD">AUD - Australian Dollar (A$)</SelectItem>
                <SelectItem value="CAD">CAD - Canadian Dollar (C$)</SelectItem>
                <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
                <SelectItem value="CNY">CNY - Chinese Yuan (¥)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle>Invoice Settings</CardTitle>
          <CardDescription>Configure how invoices are displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tax-bifurcation">Show Tax Bifurcation</Label>
              <p className="text-sm text-slate-500">
                Display detailed tax breakdown in invoices
              </p>
            </div>
            <Switch
              id="tax-bifurcation"
              checked={settings?.show_tax_bifurcation}
              onCheckedChange={(checked) => setSettings({ ...settings, show_tax_bifurcation: checked })}
              data-testid="tax-bifurcation-switch"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="rounded-full shadow-lg shadow-primary/20"
          data-testid="save-settings-button"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
