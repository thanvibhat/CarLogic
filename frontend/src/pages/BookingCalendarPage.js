import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const localizer = momentLocalizer(moment);

export default function BookingCalendarPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [zones, setZones] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedZone, setSelectedZone] = useState('all');
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week');

  useEffect(() => {
    fetchZones();
    fetchCustomers();
    fetchBookings();
  }, []);

  useEffect(() => {
    if (bookings.length > 0 && customers.length > 0) {
      const filteredBookings = selectedZone === 'all' 
        ? bookings 
        : bookings.filter(b => b.zone_id === selectedZone);

      const calendarEvents = filteredBookings.map(booking => {
        const customer = customers.find(c => c.customer_id === booking.customer_id);
        const zone = zones.find(z => z.zone_id === booking.zone_id);
        const start = new Date(booking.appointment_datetime);
        const end = new Date(start.getTime() + (booking.duration_minutes || 60) * 60000);
        
        return {
          id: booking.booking_id,
          title: `${customer?.name || 'Customer'} - ${zone?.name || 'Zone'}`,
          start: start,
          end: end,
          resource: booking,
        };
      });

      setEvents(calendarEvents);
    }
  }, [bookings, selectedZone, customers, zones]);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings`);
      setBookings(response.data);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    }
  };

  const fetchZones = async () => {
    try {
      const response = await axios.get(`${API}/zones`);
      setZones(response.data);
    } catch (error) {
      console.error('Failed to fetch zones', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const eventStyleGetter = (event) => {
    const status = event.resource.status;
    let backgroundColor = '#0066FF';
    
    if (status === 'Completed') {
      backgroundColor = '#10B981';
    } else if (status === 'Pending') {
      backgroundColor = '#FF6600';
    } else if (status === 'Cancelled') {
      backgroundColor = '#EF4444';
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.85rem',
        padding: '4px 8px'
      }
    };
  };

  const handleSelectEvent = (event) => {
    const booking = event.resource;
    const customer = customers.find(c => c.customer_id === booking.customer_id);
    const zone = zones.find(z => z.zone_id === booking.zone_id);
    
    toast.info(
      `Booking Details\nCustomer: ${customer?.name}\nZone: ${zone?.name}\nStatus: ${booking.status}\nDuration: ${booking.duration_minutes || 60} minutes`,
      { duration: 5000 }
    );
  };

  const handleSelectSlot = (slotInfo) => {
    const { start, end } = slotInfo;
    const selectedDate = new Date(start);
    
    // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateTimeLocal = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Format date only for datetime-local input (YYYY-MM-DD)
    const formatDateLocal = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // For month view, only pass date (no time)
    // For day/week views, pass date and time
    if (view === 'month') {
      navigate('/bookings', {
        state: {
          selectedDate: formatDateLocal(selectedDate),
          includeTime: false
        }
      });
    } else {
      // For day/week views, include the time
      navigate('/bookings', {
        state: {
          selectedDateTime: formatDateTimeLocal(selectedDate),
          includeTime: true
        }
      });
    }
  };

  const handleNavigate = (action) => {
    if (action === 'PREV') {
      if (view === 'month') {
        setCurrentDate(moment(currentDate).subtract(1, 'month').toDate());
      } else if (view === 'week') {
        setCurrentDate(moment(currentDate).subtract(1, 'week').toDate());
      } else {
        setCurrentDate(moment(currentDate).subtract(1, 'day').toDate());
      }
    } else if (action === 'NEXT') {
      if (view === 'month') {
        setCurrentDate(moment(currentDate).add(1, 'month').toDate());
      } else if (view === 'week') {
        setCurrentDate(moment(currentDate).add(1, 'week').toDate());
      } else {
        setCurrentDate(moment(currentDate).add(1, 'day').toDate());
      }
    } else if (action === 'TODAY') {
      setCurrentDate(new Date());
    }
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const formatDateRange = () => {
    if (view === 'month') {
      return moment(currentDate).format('MMMM YYYY');
    } else if (view === 'week') {
      const weekStart = moment(currentDate).startOf('week');
      const weekEnd = moment(currentDate).endOf('week');
      if (weekStart.month() === weekEnd.month()) {
        return `${weekStart.format('MMMM D')} – ${weekEnd.format('D, YYYY')}`;
      } else {
        return `${weekStart.format('MMMM D')} – ${weekEnd.format('MMMM D, YYYY')}`;
      }
    } else {
      return moment(currentDate).format('MMMM D, YYYY');
    }
  };

  const CustomToolbar = ({ label, onNavigate, onView }) => {
    return (
      <div className="mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate('TODAY')}
              data-testid="calendar-today-button"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate('PREV')}
              data-testid="calendar-back-button"
            >
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate('NEXT')}
              data-testid="calendar-next-button"
            >
              Next
            </Button>
          </div>
          <div className="text-center text-lg font-medium" data-testid="calendar-date-range">
            {formatDateRange()}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewChange('day')}
              className={`${
                view === 'day' 
                  ? 'bg-white shadow-sm text-black' 
                  : 'text-black hover:bg-blue-600 hover:text-white'
              }`}
              data-testid="calendar-day-view-button"
            >
              Day
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewChange('week')}
              className={`${
                view === 'week' 
                  ? 'bg-white shadow-sm text-black' 
                  : 'text-black hover:bg-blue-600 hover:text-white'
              }`}
              data-testid="calendar-week-view-button"
            >
              Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewChange('month')}
              className={`${
                view === 'month' 
                  ? 'bg-white shadow-sm text-black' 
                  : 'text-black hover:bg-blue-600 hover:text-white'
              }`}
              data-testid="calendar-month-view-button"
            >
              Month
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="booking-calendar-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/bookings')}
            data-testid="back-to-bookings-button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900" data-testid="calendar-title">
              Booking Calendar
            </h1>
            <p className="text-slate-600 mt-1">View bookings by zone</p>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger data-testid="zone-filter-select">
              <SelectValue placeholder="Filter by zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {zones.map((zone) => (
                <SelectItem key={zone.zone_id} value={zone.zone_id}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-slate-100 shadow-sm" data-testid="calendar-card">
        <CardHeader>
          <CardTitle>
            {selectedZone === 'all' 
              ? 'All Bookings' 
              : `${zones.find(z => z.zone_id === selectedZone)?.name || 'Zone'} Bookings`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              views={['month', 'week', 'day']}
              view={view}
              onView={handleViewChange}
              date={currentDate}
              onNavigate={setCurrentDate}
              step={15}
              timeslots={4}
              components={{
                toolbar: CustomToolbar
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FF6600' }}></div>
              <span className="text-sm">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }}></div>
              <span className="text-sm">Cancelled</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
