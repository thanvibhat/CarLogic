import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Edit, Calendar as CalendarIcon, Search, ChevronLeft, ChevronRight, X, CheckCircle, FileText, UserPlus, Download } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';

export default function BookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { formatCurrency, settings, getCurrencySymbol } = useSettings();
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [zones, setZones] = useState([]);
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState(null);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusChange, setStatusChange] = useState(null);
  const [invoices, setInvoices] = useState([]);

  // New Customer Dialog
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', email: '' });
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Filters and pagination
  const [customerSearch, setCustomerSearch] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('booking_number');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Customer autocomplete
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '', zone_id: '', product_ids: [], appointment_datetime: '',
    duration_minutes: 60, vehicle_pickup_by_us: false, vehicle_dropoff_by_us: false
  });
  const [availableZones, setAvailableZones] = useState([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    fetchBookings();
    fetchCustomers();
    fetchZones();
    fetchProducts();
    fetchInvoices();
  }, [customerSearch, appointmentDate, statusFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchTotalCount();
  }, [customerSearch, appointmentDate, statusFilter]);

  // Handle navigation from calendar with selected date/time
  useEffect(() => {
    if (location.state) {
      const { selectedDateTime, selectedDate, includeTime } = location.state;

      if (selectedDateTime && includeTime) {
        // For day/week views: auto-fill date and time
        setFormData(prev => ({
          ...prev,
          appointment_datetime: selectedDateTime
        }));
        setOpen(true);
        // Clear the state to prevent re-triggering
        navigate(location.pathname, { replace: true, state: null });
      } else if (selectedDate && !includeTime) {
        // For month view: auto-fill only date (time will be manual)
        // Set to start of day (00:00) - user can change time manually
        const dateWithTime = `${selectedDate}T00:00`;
        setFormData(prev => ({
          ...prev,
          appointment_datetime: dateWithTime
        }));
        setOpen(true);
        // Clear the state to prevent re-triggering
        navigate(location.pathname, { replace: true, state: null });
      }
    }
  }, [location.state, navigate, location.pathname]);

  // Check zone availability when appointment time or duration changes
  useEffect(() => {
    if (formData.appointment_datetime && !editingBooking) {
      checkZoneAvailability(formData.appointment_datetime, formData.duration_minutes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.appointment_datetime, formData.duration_minutes, editingBooking]);

  const fetchBookings = async () => {
    try {
      const params = new URLSearchParams({
        sort_by: sortBy,
        sort_order: sortOrder,
        page: page.toString(),
        page_size: pageSize.toString()
      });

      if (customerSearch) params.append('customer_search', customerSearch);
      if (appointmentDate) params.append('appointment_date', appointmentDate);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await axios.get(`${API}/bookings?${params}`);
      setBookings(response.data);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    }
  };

  const fetchTotalCount = async () => {
    try {
      const params = new URLSearchParams();
      if (customerSearch) params.append('customer_search', customerSearch);
      if (appointmentDate) params.append('appointment_date', appointmentDate);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await axios.get(`${API}/bookings/count?${params}`);
      setTotalCount(response.data.total);
    } catch (error) {
      console.error('Failed to fetch count', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
      setAllCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const fetchZones = async () => {
    try {
      const response = await axios.get(`${API}/zones`);
      setZones(response.data.filter(z => z.is_active));
    } catch (error) {
      console.error('Failed to fetch zones', error);
    }
  };

  const checkZoneAvailability = async (appointmentDatetime, durationMinutes) => {
    if (!appointmentDatetime) {
      setAvailableZones([]);
      return;
    }

    setCheckingAvailability(true);
    try {
      // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO format for API
      // datetime-local doesn't include timezone, so we need to ensure proper conversion
      const date = new Date(appointmentDatetime);
      if (isNaN(date.getTime())) {
        console.error('Invalid datetime format:', appointmentDatetime);
        setAvailableZones([]);
        return;
      }
      const isoDateTime = date.toISOString();

      const response = await axios.get(`${API}/zones/available`, {
        params: {
          appointment_datetime: isoDateTime,
          duration_minutes: durationMinutes || 60
        }
      });

      const available = response.data.available_zones || [];
      setAvailableZones(available);
    } catch (error) {
      console.error('Failed to check zone availability', error);
      // On error, show all zones so user can still select
      setAvailableZones(zones);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`);
      setInvoices(response.data);
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    }
  };

  const getBookingInvoice = (bookingId) => {
    return invoices.find(inv => inv.booking_id === bookingId);
  };

  const downloadInvoicePdf = async (invoice, customer) => {
    try {
      if (!invoice || !invoice.items || invoice.items.length === 0) {
        toast.error('Invalid invoice data');
        return;
      }

      const doc = new jsPDF();
      const customerName = customer?.name || 'N/A';
      const customerPhone = customer?.phone || 'N/A';
      const fullInvoiceNumber = `${invoice.invoice_prefix || ''}${invoice.invoice_number || ''}`;
      const currencySymbol = getCurrencySymbol(settings?.currency || 'USD');
      // Standard jsPDF fonts do not include the ₹ glyph; fall back to a textual prefix
      const safeCurrencySymbol = currencySymbol === '₹' ? 'INR ' : currencySymbol;
      const formatMoney = (value) =>
        `${safeCurrencySymbol}${(Number(value) || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Car Logic', 105, 20, { align: 'center' });

      doc.setFontSize(16);
      doc.text('INVOICE', 105, 30, { align: 'center' });

      // Invoice details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice Number: ${fullInvoiceNumber}`, 20, 45);
      doc.text(`Date: ${format(new Date(invoice.created_at), 'PPP')}`, 20, 52);
      doc.text(`Customer: ${customerName}`, 20, 59);
      doc.text(`Phone: ${customerPhone}`, 20, 66);

      // Prepare table data
      const tableData = invoice.items.map(item => [
        item.product_name || 'N/A',
        formatMoney(item.price),
        formatMoney(item.tax_amount),
        formatMoney(item.total)
      ]);

      // Add table using autoTable; jspdf-autotable extends jsPDF prototype
      if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          startY: 75,
          head: [['Service', 'Price', 'Tax', 'Total']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [0, 102, 255] },
          styles: { fontSize: 9 },
          columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' }
          }
        });
      } else {
        try {
          const autoTableModule = await import('jspdf-autotable');
          const autoTableFunc = autoTableModule.default || autoTableModule.autoTable || autoTableModule;
          if (typeof autoTableFunc === 'function') {
            autoTableFunc(doc, {
              startY: 75,
              head: [['Service', 'Price', 'Tax', 'Total']],
              body: tableData,
              theme: 'grid',
              headStyles: { fillColor: [0, 102, 255] },
              styles: { fontSize: 9 },
              columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' }
              }
            });
          } else {
            throw new Error('autoTable function not found in module');
          }
        } catch (importError) {
          console.error('Failed to import autoTable:', importError);
          throw new Error('Failed to load PDF table plugin. Please refresh the page and try again.');
        }
      }

      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 120;

      // Summary section
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Subtotal:`, 130, finalY);
      doc.text(formatMoney(invoice.subtotal), 180, finalY, { align: 'right' });

      doc.text(`Tax:`, 130, finalY + 7);
      doc.text(formatMoney(invoice.tax_amount), 180, finalY + 7, { align: 'right' });

      if (invoice.discount_percentage > 0) {
        doc.text(`Discount (${invoice.discount_percentage}%):`, 130, finalY + 14);
        doc.text(`-${formatMoney(invoice.discount_amount)}`, 180, finalY + 14, { align: 'right' });
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const totalY = invoice.discount_percentage > 0 ? finalY + 21 : finalY + 14;
      doc.text(`Total:`, 130, totalY);
      doc.text(formatMoney(invoice.total), 180, totalY, { align: 'right' });

      const fileName = `invoice_${fullInvoiceNumber || invoice.invoice_id}.pdf`;
      doc.save(fileName);
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  };

  const handleDownloadInvoiceFromBooking = async (bookingId) => {
    const invoice = getBookingInvoice(bookingId);
    if (!invoice) {
      toast.error('No invoice found for this booking');
      return;
    }
    const customer = customers.find(c => c.customer_id === invoice.customer_id);
    await downloadInvoicePdf(invoice, customer);
  };

  const handleGenerateInvoice = (booking) => {
    // Navigate to Invoices page and open Generate Invoice dialog
    navigate('/invoices', { state: { bookingId: booking.booking_id } });
  };

  const handleViewInvoice = async (bookingId) => {
    const invoice = getBookingInvoice(bookingId);
    if (invoice) {
      try {
        const response = await axios.get(`${API}/invoices/${invoice.invoice_id}`);
        const customer = customers.find(c => c.customer_id === response.data.customer_id);
        setSelectedInvoice({ ...response.data, customer });
        setInvoicePreviewOpen(true);
      } catch (error) {
        toast.error('Failed to load invoice');
      }
    }
  };

  const confirmStatusChange = async () => {
    try {
      await axios.put(`${API}/bookings/${statusChange.booking.booking_id}`, { status: statusChange.newStatus });
      toast.success('Booking status updated');
      setStatusDialogOpen(false);
      setStatusChange(null);
      fetchBookings();
    } catch (error) {
      toast.error('Failed to update booking status');
    }
  };

  const handleStatusChangeRequest = (booking, newStatus) => {
    setStatusChange({ booking, newStatus });
    setStatusDialogOpen(true);
  };

  const searchCustomers = async (query) => {
    if (query.length < 2) {
      setCustomerSuggestions([]);
      setSearchPerformed(false);
      setShowSuggestions(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/customers/search/${query}`);
      setCustomerSuggestions(response.data);
      setShowSuggestions(true);
      setSearchPerformed(true);
    } catch (error) {
      console.error('Failed to search customers', error);
      setCustomerSuggestions([]);
      setShowSuggestions(true);
      setSearchPerformed(true);
    }
  };

  const handleCustomerQueryChange = (value) => {
    setCustomerQuery(value);
    searchCustomers(value);
  };

  const selectCustomer = (customer) => {
    setFormData({ ...formData, customer_id: customer.customer_id });
    setCustomerQuery(`${customer.name} - ${customer.phone}`);
    setShowSuggestions(false);
    setSearchPerformed(false);
  };

  const clearCustomerSelection = () => {
    setFormData({ ...formData, customer_id: '' });
    setCustomerQuery('');
    setCustomerSuggestions([]);
    setSearchPerformed(false);
  };

  const openNewCustomerDialog = () => {
    // Pre-fill with searched query if it looks like a name or phone
    const query = customerQuery.trim();
    const isPhone = /^\d+$/.test(query);
    setNewCustomerData({
      name: isPhone ? '' : query,
      phone: isPhone ? query : '',
      email: ''
    });
    setNewCustomerDialogOpen(true);
    setShowSuggestions(false);
  };

  const handleCreateNewCustomer = async (e) => {
    e.preventDefault();
    try {
      // Only include email if it's not empty
      const customerData = {
        name: newCustomerData.name,
        phone: newCustomerData.phone
      };
      if (newCustomerData.email && newCustomerData.email.trim()) {
        customerData.email = newCustomerData.email.trim();
      }

      const response = await axios.post(`${API}/customers`, customerData);
      toast.success('Customer created successfully');
      setNewCustomerDialogOpen(false);
      // Select the newly created customer
      selectCustomer(response.data);
      // Refresh customers list
      fetchCustomers();
    } catch (error) {
      // Handle Pydantic validation errors which come as array of objects
      const detail = error.response?.data?.detail;
      let errorMessage = 'Failed to create customer';
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        // Pydantic validation error format
        errorMessage = detail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
      }
      toast.error(errorMessage);
    }
  };

  const roundToNearest15 = (value) => {
    const num = parseInt(value) || 0;
    return Math.ceil(num / 15) * 15;
  };

  const handleDurationBlur = (e) => {
    const roundedValue = roundToNearest15(e.target.value);
    setFormData({ ...formData, duration_minutes: roundedValue });
  };

  const calculateEndTime = () => {
    if (formData.appointment_datetime && formData.duration_minutes) {
      try {
        const startDate = new Date(formData.appointment_datetime);
        const endDate = addMinutes(startDate, formData.duration_minutes);
        return format(endDate, 'PPpp');
      } catch (error) {
        return 'Invalid date';
      }
    }
    return '-';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate customer is selected
    if (!formData.customer_id) {
      toast.error('Please select a customer from the list or add a new one');
      return;
    }

    try {
      if (editingBooking) {
        await axios.put(`${API}/bookings/${editingBooking.booking_id}`, {
          customer_id: formData.customer_id,
          appointment_datetime: formData.appointment_datetime,
          duration_minutes: formData.duration_minutes,
          vehicle_pickup_by_us: formData.vehicle_pickup_by_us,
          vehicle_dropoff_by_us: formData.vehicle_dropoff_by_us
        });
        toast.success('Booking updated successfully');
      } else {
        await axios.post(`${API}/bookings`, formData);
        toast.success('Booking created successfully');
      }
      setOpen(false);
      setEditingBooking(null);
      setFormData({
        customer_id: '', zone_id: '', product_ids: [], appointment_datetime: '',
        duration_minutes: 60, vehicle_pickup_by_us: false, vehicle_dropoff_by_us: false
      });
      setAvailableZones([]);
      setCustomerQuery('');
      fetchBookings();
      fetchTotalCount();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (booking) => {
    setEditingBooking(booking);
    const customer = customers.find(c => c.customer_id === booking.customer_id);
    setCustomerQuery(customer ? `${customer.name} - ${customer.phone}` : '');
    setFormData({
      customer_id: booking.customer_id,
      zone_id: booking.zone_id,
      product_ids: booking.product_ids || [],
      appointment_datetime: format(new Date(booking.appointment_datetime), "yyyy-MM-dd'T'HH:mm"),
      duration_minutes: booking.duration_minutes || 60,
      vehicle_pickup_by_us: booking.vehicle_pickup_by_us,
      vehicle_dropoff_by_us: booking.vehicle_dropoff_by_us
    });
    setOpen(true);
  };

  const handleCancelBooking = async () => {
    try {
      await axios.put(`${API}/bookings/${bookingToCancel.booking_id}/cancel`);
      toast.success('Booking cancelled successfully');
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      fetchBookings();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const toggleProduct = (productId) => {
    setFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId]
    }));
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.customer_id === customerId);
    return customer?.name || '-';
  };

  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.zone_id === zoneId);
    return zone?.name || '-';
  };

  const clearFilters = () => {
    setCustomerSearch('');
    setAppointmentDate(format(new Date(), 'yyyy-MM-dd'));
    setStatusFilter('all');
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6" data-testid="bookings-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900" data-testid="bookings-title">Bookings</h1>
          <p className="text-slate-600 mt-1">Manage car wash appointments</p>
        </div>
        <div className="flex gap-2">
          <Link to="/bookings/calendar">
            <Button variant="outline" className="rounded-full" data-testid="calendar-view-button">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="rounded-full shadow-lg shadow-primary/20"
                onClick={() => {
                  setEditingBooking(null);
                  setCustomerQuery('');
                  setFormData({
                    customer_id: '', zone_id: '', product_ids: [], appointment_datetime: '',
                    duration_minutes: 60, vehicle_pickup_by_us: false, vehicle_dropoff_by_us: false
                  });
                }}
                data-testid="add-booking-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="booking-dialog">
              <DialogHeader>
                <DialogTitle>{editingBooking ? 'Edit Booking' : 'Create New Booking'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="customer_search">Customer *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewCustomerData({ name: '', phone: '', email: '' });
                        setNewCustomerDialogOpen(true);
                      }}
                      className="h-7 text-xs"
                      data-testid="add-customer-button"
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Add New
                    </Button>
                  </div>
                  <div className="relative">
                    <div className="flex gap-2">
                      <Input
                        id="customer_search"
                        placeholder="Type customer name or mobile number..."
                        value={customerQuery}
                        onChange={(e) => handleCustomerQueryChange(e.target.value)}
                        onFocus={() => customerSuggestions.length > 0 && setShowSuggestions(true)}
                        data-testid="customer-search-input"
                        className={!formData.customer_id && customerQuery ? "border-orange-300" : ""}
                      />
                      {formData.customer_id && (
                        <Button type="button" variant="ghost" size="sm" onClick={clearCustomerSelection}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {!formData.customer_id && customerQuery && (
                      <p className="text-xs text-orange-500 mt-1">Please select a customer from the list or add a new one</p>
                    )}
                    {showSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {customerSuggestions.length > 0 ? (
                          customerSuggestions.map((customer) => (
                            <div
                              key={customer.customer_id}
                              className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => selectCustomer(customer)}
                              data-testid={`customer-suggestion-${customer.customer_id}`}
                            >
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-slate-600">{customer.phone}</p>
                            </div>
                          ))
                        ) : searchPerformed && customerQuery.length >= 2 ? (
                          <div
                            className="p-3 hover:bg-blue-50 cursor-pointer text-blue-600 flex items-center gap-2"
                            onClick={openNewCustomerDialog}
                            data-testid="add-new-customer-option"
                          >
                            <UserPlus className="h-4 w-4" />
                            <span>Add new customer &quot;{customerQuery}&quot;</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="datetime">Appointment Date & Time *</Label>
                  <input
                    id="datetime"
                    type="datetime-local"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.appointment_datetime}
                    onChange={(e) => setFormData({ ...formData, appointment_datetime: e.target.value })}
                    required
                    data-testid="booking-datetime-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    step="1"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    onBlur={handleDurationBlur}
                    required
                    data-testid="booking-duration-input"
                  />
                  <p className="text-xs text-slate-500">Will be rounded to nearest multiple of 15</p>
                </div>

                <div className="space-y-2">
                  <Label>Appointment End By</Label>
                  <div className="p-3 bg-slate-50 rounded-md border" data-testid="booking-end-time">
                    <p className="text-sm font-medium">{calculateEndTime()}</p>
                  </div>
                </div>

                {!editingBooking && (
                  <>
                    <div className="space-y-2">
                      <Label>Zone Assignment *</Label>
                      <Select
                        value={formData.zone_id}
                        onValueChange={(value) => setFormData({ ...formData, zone_id: value })}
                        required
                        disabled={checkingAvailability}
                      >
                        <SelectTrigger data-testid="booking-zone-select">
                          <SelectValue placeholder={checkingAvailability ? "Checking availability..." : "Select available zone"} />
                        </SelectTrigger>
                        <SelectContent>
                          {checkingAvailability ? (
                            <div className="p-2 text-sm text-slate-500">Checking availability...</div>
                          ) : availableZones.length > 0 ? (
                            availableZones.map((zone) => (
                              <SelectItem key={zone.zone_id} value={zone.zone_id}>{zone.name}</SelectItem>
                            ))
                          ) : (
                            formData.appointment_datetime ? (
                              <div className="p-2 text-sm text-red-600">No zones available for this time slot</div>
                            ) : (
                              zones.map((zone) => (
                                <SelectItem key={zone.zone_id} value={zone.zone_id}>{zone.name}</SelectItem>
                              ))
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Services *</Label>
                      <div className="space-y-2 border rounded-lg p-4 max-h-40 overflow-y-auto">
                        {products.map((product) => (
                          <div key={product.product_id} className="flex items-center space-x-2">
                            <Checkbox
                              id={product.product_id}
                              checked={formData.product_ids.includes(product.product_id)}
                              onCheckedChange={() => toggleProduct(product.product_id)}
                              data-testid={`product-checkbox-${product.product_id}`}
                            />
                            <Label htmlFor={product.product_id} className="font-normal cursor-pointer">{product.name} ({formatCurrency(product.sell_price)})</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pickup"
                      checked={formData.vehicle_pickup_by_us}
                      onCheckedChange={(checked) => setFormData({ ...formData, vehicle_pickup_by_us: checked })}
                      data-testid="booking-pickup-checkbox"
                    />
                    <Label htmlFor="pickup" className="cursor-pointer">We will pick up the vehicle</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dropoff"
                      checked={formData.vehicle_dropoff_by_us}
                      onCheckedChange={(checked) => setFormData({ ...formData, vehicle_dropoff_by_us: checked })}
                      data-testid="booking-dropoff-checkbox"
                    />
                    <Label htmlFor="dropoff" className="cursor-pointer">We will drop off the vehicle</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="rounded-full" data-testid="booking-submit-button">
                    {editingBooking ? 'Update Booking' : 'Create Booking'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Filters</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Customer Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Name or mobile"
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setPage(1); }}
                  className="pl-10"
                  data-testid="filter-customer-search"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Appointment Date</Label>
              <Input
                type="date"
                value={appointmentDate}
                onChange={(e) => { setAppointmentDate(e.target.value); setPage(1); }}
                data-testid="filter-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
                <SelectTrigger data-testid="filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort By</Label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger data-testid="sort-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking_number">Booking ID</SelectItem>
                    <SelectItem value="appointment_datetime">Appointment Date</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  data-testid="sort-order-toggle"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to cancel booking #{bookingToCancel?.booking_number}?</p>
          <p className="text-sm text-slate-600">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>No, Keep It</Button>
            <Button variant="destructive" onClick={handleCancelBooking} data-testid="confirm-cancel-booking">Yes, Cancel Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Booking Status</DialogTitle>
          </DialogHeader>
          <p>Change booking #{statusChange?.booking?.booking_number} status to <strong>{statusChange?.newStatus}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmStatusChange} data-testid="confirm-status-change">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Dialog */}
      <Dialog open={invoicePreviewOpen} onOpenChange={setInvoicePreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-heading font-bold">Car Logic</h2>
                <p className="text-lg font-semibold mt-2">INVOICE</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Invoice Number:</p>
                  <p>{selectedInvoice.invoice_prefix || ''}{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="font-semibold">Date:</p>
                  <p>{format(new Date(selectedInvoice.created_at), 'PPP')}</p>
                </div>
                <div>
                  <p className="font-semibold">Customer:</p>
                  <p>{selectedInvoice.customer?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-semibold">Phone:</p>
                  <p>{selectedInvoice.customer?.phone || 'N/A'}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedInvoice.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{formatCurrency(item.price)}</TableCell>
                      <TableCell>{formatCurrency(item.tax_amount)}</TableCell>
                      <TableCell>{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span className="font-medium">{formatCurrency(selectedInvoice.tax_amount)}</span>
                </div>
                {selectedInvoice.discount_percentage > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({selectedInvoice.discount_percentage}%):</span>
                    <span className="font-medium">-{formatCurrency(selectedInvoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={newCustomerDialogOpen} onOpenChange={setNewCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateNewCustomer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_customer_name">Name *</Label>
              <Input
                id="new_customer_name"
                placeholder="Customer name"
                value={newCustomerData.name}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                required
                data-testid="new-customer-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_customer_phone">Mobile Number *</Label>
              <Input
                id="new_customer_phone"
                placeholder="Mobile number"
                value={newCustomerData.phone}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                required
                data-testid="new-customer-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_customer_email">Email (Optional)</Label>
              <Input
                id="new_customer_email"
                type="email"
                placeholder="customer@example.com"
                value={newCustomerData.email}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                data-testid="new-customer-email-input"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewCustomerDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-full" data-testid="save-new-customer-button">
                <UserPlus className="h-4 w-4 mr-2" />
                Save Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-slate-100 shadow-sm" data-testid="bookings-table-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Booking List ({totalCount} total)</CardTitle>
            <div className="text-sm text-slate-600">Page {page} of {totalPages}</div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Appointment</TableHead>
                <TableHead className="hidden md:table-cell">Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Invoice PDF</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.booking_id} data-testid={`booking-row-${booking.booking_id}`}>
                  <TableCell className="font-medium">#{booking.booking_number || booking.booking_id.slice(0, 8)}</TableCell>
                  <TableCell>{getCustomerName(booking.customer_id)}</TableCell>
                  <TableCell>{getZoneName(booking.zone_id)}</TableCell>
                  <TableCell>{format(new Date(booking.appointment_datetime), 'PPp')}</TableCell>
                  <TableCell className="hidden md:table-cell">{booking.duration_minutes || 60} min</TableCell>
                  <TableCell>
                    <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium uppercase ${booking.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      booking.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                        booking.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                      }`}>
                      {booking.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {booking.status === 'Completed' && getBookingInvoice(booking.booking_id) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoiceFromBooking(booking.booking_id)}
                        data-testid={`booking-download-invoice-${booking.booking_id}`}
                        title="Download invoice PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(booking)}
                        data-testid={`edit-booking-${booking.booking_id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {/* Invoice Generation/View */}
                      {booking.status === 'Completed' && (
                        <>
                          {getBookingInvoice(booking.booking_id) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewInvoice(booking.booking_id)}
                              className="text-green-600 hover:text-green-700"
                              data-testid={`view-invoice-${booking.booking_id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => handleGenerateInvoice(booking)}
                              data-testid={`generate-invoice-${booking.booking_id}`}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Invoice
                            </Button>
                          )}
                        </>
                      )}

                      {booking.status === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => handleStatusChangeRequest(booking, 'Completed')}
                            data-testid={`complete-booking-${booking.booking_id}`}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-red-600 hover:text-red-700"
                            onClick={() => { setBookingToCancel(booking); setCancelDialogOpen(true); }}
                            data-testid={`cancel-booking-${booking.booking_id}`}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {bookings.length === 0 && (
            <p className="text-center text-slate-500 py-8">No bookings found for the selected filters.</p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                data-testid="prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                data-testid="next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}