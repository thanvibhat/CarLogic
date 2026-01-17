import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Calendar, CheckCircle, Clock, MapPin, Activity } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchRecentBookings();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  const fetchRecentBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings`);
      setBookings(response.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch bookings', error);
    }
  };

  const statCards = [
    { title: 'Total Customers', value: stats?.total_customers || 0, icon: Users, color: 'text-blue-600' },
    { title: 'Total Bookings', value: stats?.total_bookings || 0, icon: Calendar, color: 'text-purple-600' },
    { title: 'Pending Bookings', value: stats?.pending_bookings || 0, icon: Clock, color: 'text-orange-600' },
    { title: 'Completed Bookings', value: stats?.completed_bookings || 0, icon: CheckCircle, color: 'text-green-600' },
    { title: 'Total Zones', value: stats?.total_zones || 0, icon: MapPin, color: 'text-indigo-600' },
    { title: 'Active Zones', value: stats?.active_zones || 0, icon: Activity, color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-4xl font-heading font-bold text-slate-900" data-testid="dashboard-title">Dashboard</h1>
        <p className="text-slate-600 mt-2">Welcome to Car Logic Car Wash Management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-200" data-testid={`stat-card-${idx}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-heading font-bold text-slate-900">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-slate-100 shadow-sm" data-testid="recent-bookings-card">
        <CardHeader>
          <CardTitle className="text-xl font-heading">Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.booking_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg" data-testid={`booking-item-${booking.booking_id}`}>
                  <div>
                    <p className="font-medium text-slate-900">Booking #{booking.booking_id.slice(0, 8)}</p>
                    <p className="text-sm text-slate-600">{new Date(booking.appointment_datetime).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                    booking.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    booking.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`} data-testid={`booking-status-${booking.booking_id}`}>
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No bookings yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}