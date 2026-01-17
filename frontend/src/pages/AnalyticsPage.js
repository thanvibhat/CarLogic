import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { TrendingUp, DollarSign, Users, Calendar } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

const COLORS = ['#0066FF', '#FF6600', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsPage() {
  const { formatCurrency } = useSettings();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/dashboard`);
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-600">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-600">No analytics data available</p>
      </div>
    );
  }

  // Transform data for charts
  const bookingsStatusData = Object.entries(analytics.bookings_by_status || {}).map(([status, count]) => ({
    name: status,
    value: count
  }));

  const bookingsMonthData = Object.entries(analytics.bookings_by_month || {}).map(([month, count]) => ({
    month: month,
    bookings: count
  }));

  const revenueMonthData = Object.entries(analytics.revenue_by_month || {}).map(([month, revenue]) => ({
    month: month,
    revenue: revenue
  }));

  const zoneUtilizationData = Object.entries(analytics.zone_utilization || {}).map(([zone, count]) => ({
    zone: zone,
    bookings: count
  }));

  const customersMonthData = Object.entries(analytics.customers_by_month || {}).map(([month, count]) => ({
    month: month,
    customers: count
  }));

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900" data-testid="analytics-title">Analytics Dashboard</h1>
        <p className="text-slate-600 mt-1">Business insights and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.total_revenue || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Booking & Customer Analytics */}
      <div className="space-y-4">
        <h2 className="text-xl font-heading font-semibold text-slate-900">Booking & Customer Insights</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bookings by Status */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Bookings by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bookingsStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bookingsStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bookings Trend */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Bookings Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={bookingsMonthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="bookings" stroke="#0066FF" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Customer Growth */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Customer Growth (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={customersMonthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="customers" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Zone Utilization */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Zone Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={zoneUtilizationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zone" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bookings" fill="#FF6600" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Financial Analytics */}
      <div className="space-y-4">
        <h2 className="text-xl font-heading font-semibold text-slate-900">Financial Insights</h2>
        <div className="grid grid-cols-1 gap-6">
          {/* Revenue Trend */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Revenue Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={revenueMonthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
