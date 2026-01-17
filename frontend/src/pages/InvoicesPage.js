import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Download, Mail, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
// Import jspdf-autotable - it extends jsPDF prototype with autoTable method
// For v5, we need to import it as a side effect
import 'jspdf-autotable';
import { format } from 'date-fns';
import { useSettings } from '../hooks/useSettings';
import { useLocation, useNavigate } from 'react-router-dom';

export default function InvoicesPage() {
  const { user } = useAuth();
  const { formatCurrency, settings, getCurrencySymbol } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [formData, setFormData] = useState({ 
    booking_id: '', 
    discount_percentage: '0',
    discount_amount: '0',
    invoice_prefix: ''
  });
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  
  // Check if user can edit services (Admin or Manager only)
  const canEditServices = user?.role === 'Admin' || user?.role === 'Manager';

  // When navigated from Bookings page with a specific bookingId,
  // auto-open the Generate Invoice dialog and pre-select that booking.
  useEffect(() => {
    const bookingIdFromState = location.state?.bookingId;
    if (bookingIdFromState) {
      setOpen(true);
      setFormData(prev => ({ ...prev, booking_id: bookingIdFromState }));
      // Initialize selected products from booking
      const booking = bookings.find(b => b.booking_id === bookingIdFromState);
      if (booking) {
        setSelectedProductIds(booking.product_ids || []);
      }
      // Clear state so dialog doesn't auto-open again on future navigations
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, bookings]);

  useEffect(() => {
    fetchInvoices();
    fetchBookings();
    fetchCustomers();
    fetchAllProducts();
    fetchLatestPrefix();
  }, []);

  useEffect(() => {
    if (formData.booking_id) {
      // Initialize selected products from booking when booking is selected
      const booking = bookings.find(b => b.booking_id === formData.booking_id);
      if (booking) {
        setSelectedProductIds(booking.product_ids || []);
      }
      calculatePreview();
    } else {
      setSelectedProductIds([]);
      setPreviewData(null);
    }
  }, [formData.booking_id]);

  useEffect(() => {
    if (formData.booking_id && selectedProductIds.length > 0) {
      calculatePreview();
    }
  }, [selectedProductIds, formData.discount_percentage, formData.discount_amount]);

  const fetchLatestPrefix = async () => {
    try {
      const response = await axios.get(`${API}/invoices/latest-prefix`);
      setFormData(prev => ({ ...prev, invoice_prefix: response.data.prefix || '' }));
    } catch (error) {
      console.error('Failed to fetch latest prefix', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`);
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings`);
      setBookings(response.data.filter(b => b.status === 'Completed'));
    } catch (error) {
      console.error('Failed to fetch bookings', error);
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

  const fetchAllProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setAllProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const calculatePreview = async () => {
    if (!formData.booking_id || selectedProductIds.length === 0) return;
    
    try {
      const booking = bookings.find(b => b.booking_id === formData.booking_id);
      if (!booking) return;

      // Use selected products (can be modified by Admin/Manager)
      const products = allProducts.filter(p => selectedProductIds.includes(p.product_id));
      
      const allTaxIds = [];
      products.forEach(p => allTaxIds.push(...p.tax_ids));
      
      let taxesMap = {};
      if (allTaxIds.length > 0) {
        const taxesRes = await axios.get(`${API}/taxes`);
        taxesRes.data.forEach(t => {
          if (allTaxIds.includes(t.tax_id)) {
            taxesMap[t.tax_id] = t;
          }
        });
      }

      let subtotal = 0;
      const items = [];
      const taxBreakdown = {};

      products.forEach(product => {
        const itemPrice = product.sell_price;
        let itemTaxAmount = 0;

        product.tax_ids.forEach(taxId => {
          if (taxesMap[taxId]) {
            const tax = taxesMap[taxId];
            const taxAmt = (itemPrice * tax.percentage / 100);
            itemTaxAmount += taxAmt;
            
            if (!taxBreakdown[tax.name]) {
              taxBreakdown[tax.name] = { percentage: tax.percentage, amount: 0 };
            }
            taxBreakdown[tax.name].amount += taxAmt;
          }
        });

        items.push({
          product_name: product.name,
          price: itemPrice,
          tax_amount: itemTaxAmount,
          total: itemPrice + itemTaxAmount
        });
        subtotal += itemPrice;
      });

      const totalTax = Object.values(taxBreakdown).reduce((sum, t) => sum + t.amount, 0);
      const beforeDiscount = subtotal + totalTax;
      
      let discountAmount = parseFloat(formData.discount_amount) || 0;
      let discountPercentage = parseFloat(formData.discount_percentage) || 0;
      
      const total = beforeDiscount - discountAmount;

      setPreviewData({
        items,
        subtotal,
        taxBreakdown,
        totalTax,
        beforeDiscount,
        discountAmount,
        discountPercentage,
        total,
        customer: customers.find(c => c.customer_id === booking.customer_id)
      });
    } catch (error) {
      console.error('Failed to calculate preview', error);
    }
  };

  const handleDiscountPercentageChange = (value) => {
    if (!previewData) {
      setFormData({ ...formData, discount_percentage: value, discount_amount: '0' });
      return;
    }
    
    const percentage = parseFloat(value) || 0;
    const amount = (previewData.beforeDiscount * percentage / 100).toFixed(2);
    setFormData({ ...formData, discount_percentage: value, discount_amount: amount });
  };

  const handleDiscountAmountChange = (value) => {
    if (!previewData) {
      setFormData({ ...formData, discount_amount: value, discount_percentage: '0' });
      return;
    }
    
    const amount = parseFloat(value) || 0;
    const percentage = previewData.beforeDiscount > 0 
      ? ((amount / previewData.beforeDiscount) * 100).toFixed(2)
      : '0';
    setFormData({ ...formData, discount_amount: value, discount_percentage: percentage });
  };

  const toggleProduct = (productId) => {
    setSelectedProductIds(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedProductIds.length === 0) {
      toast.error('Please select at least one service');
      return;
    }
    
    try {
      // Staff cannot apply discounts - force to 0
      const discountPercentage = canEditServices 
        ? parseFloat(formData.discount_percentage) 
        : 0;
      
      const data = {
        booking_id: formData.booking_id,
        discount_percentage: discountPercentage,
        invoice_prefix: formData.invoice_prefix
      };
      
      // Only send product_ids if user can edit services and they differ from booking
      if (canEditServices) {
        const booking = bookings.find(b => b.booking_id === formData.booking_id);
        const bookingProductIds = booking?.product_ids || [];
        const productIdsChanged = JSON.stringify([...selectedProductIds].sort()) !== JSON.stringify([...bookingProductIds].sort());
        
        if (productIdsChanged) {
          data.product_ids = selectedProductIds;
        }
      }
      
      const response = await axios.post(`${API}/invoices`, data);
      toast.success('Invoice created successfully');
      setOpen(false);
      setFormData({ booking_id: '', discount_percentage: '0', discount_amount: '0', invoice_prefix: response.data.invoice_prefix || '' });
      setSelectedProductIds([]);
      setPreviewData(null);
      fetchInvoices();
      fetchBookings(); // Refresh bookings in case product_ids were updated
      
      const fullInvoice = await axios.get(`${API}/invoices/${response.data.invoice_id}`);
      const customer = customers.find(c => c.customer_id === fullInvoice.data.customer_id);
      await generatePDF(fullInvoice.data, customer);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invoice creation failed');
    }
  };

  const generatePDF = async (invoice, customer) => {
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

      // Add table using autoTable
      // jspdf-autotable v5 extends jsPDF prototype when imported as side effect
      // If autoTable is not available, try dynamic import as fallback
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
        // Fallback: dynamically import and use as function
        try {
          const autoTableModule = await import('jspdf-autotable');
          // Try different export formats
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

      // Get the final Y position after the table
      // autoTable adds lastAutoTable property to the doc instance
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

      // Save PDF
      const fileName = `invoice_${fullInvoiceNumber || invoice.invoice_id}.pdf`;
      doc.save(fileName);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  };

  const handleDownload = async (invoiceId) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}`);
      const customer = customers.find(c => c.customer_id === response.data.customer_id);
      await generatePDF(response.data, customer);
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const handlePreview = async (invoiceId) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}`);
      const customer = customers.find(c => c.customer_id === response.data.customer_id);
      setSelectedInvoice({ ...response.data, customer });
      setPreviewOpen(true);
    } catch (error) {
      toast.error('Failed to load invoice');
    }
  };

  const handleEmailClick = (invoice) => {
    setSelectedInvoice(invoice);
    const customer = customers.find(c => c.customer_id === invoice.customer_id);
    setSelectedInvoice({ ...invoice, customer });
    setEmailAddress(customer?.email || '');
    setEmailOpen(true);
  };

  const handleEmailInvoice = async () => {
    if (!emailAddress) {
      toast.error('Please enter an email address');
      return;
    }
    try {
      await axios.post(`${API}/invoices/email`, {
        invoice_id: selectedInvoice.invoice_id,
        recipient_email: emailAddress
      });
      toast.success(`Invoice emailed to ${emailAddress}`);
      setEmailOpen(false);
      setEmailAddress('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.customer_id === customerId);
    return customer?.name || '-';
  };

  const getFullInvoiceNumber = (invoice) => {
    return `${invoice.invoice_prefix || ''}${invoice.invoice_number || invoice.invoice_id.slice(0, 8)}`;
  };

  return (
    <div className="space-y-6" data-testid="invoices-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900" data-testid="invoices-title">Invoices</h1>
          <p className="text-slate-600 mt-1">Generate and manage invoices</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button 
              className="rounded-full shadow-lg shadow-primary/20" 
              onClick={() => { 
                fetchLatestPrefix();
                // Reset discount to 0 for Staff (they can't use discounts anyway)
                const initialDiscount = canEditServices ? '0' : '0';
                setFormData({ booking_id: '', discount_percentage: initialDiscount, discount_amount: initialDiscount, invoice_prefix: '' });
                setSelectedProductIds([]);
                setPreviewData(null);
              }} 
              data-testid="add-invoice-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="invoice-dialog">
            <DialogHeader>
              <DialogTitle>Generate New Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_prefix">Invoice Prefix (Optional)</Label>
                <Input
                  id="invoice_prefix"
                  placeholder="e.g., INV-2025-"
                  value={formData.invoice_prefix}
                  onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                  data-testid="invoice-prefix-input"
                />
                <p className="text-xs text-slate-500">Previous prefix will be auto-filled. Edit as needed.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking">Completed Booking *</Label>
                <Select 
                  value={formData.booking_id} 
                  onValueChange={(value) => setFormData({ ...formData, booking_id: value })} 
                  required
                >
                  <SelectTrigger data-testid="invoice-booking-select">
                    <SelectValue placeholder="Select booking" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map((booking) => {
                      const customer = customers.find(c => c.customer_id === booking.customer_id);
                      return (
                        <SelectItem key={booking.booking_id} value={booking.booking_id}>
                          {customer?.name} - Booking #{booking.booking_id.slice(0, 8)} - {format(new Date(booking.appointment_datetime), 'PPP')}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Selection - Only for Admin and Manager */}
              {formData.booking_id && canEditServices && (
                <div className="space-y-2">
                  <Label>Services *</Label>
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto bg-white">
                    {allProducts.length === 0 ? (
                      <p className="text-sm text-slate-500">Loading products...</p>
                    ) : (
                      <div className="space-y-2">
                        {allProducts.map((product) => (
                          <div key={product.product_id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`product-${product.product_id}`}
                              checked={selectedProductIds.includes(product.product_id)}
                              onCheckedChange={() => toggleProduct(product.product_id)}
                              data-testid={`invoice-product-checkbox-${product.product_id}`}
                            />
                            <Label 
                              htmlFor={`product-${product.product_id}`} 
                              className="font-normal cursor-pointer flex-1 flex justify-between items-center"
                            >
                              <span>{product.name}</span>
                              <span className="text-sm text-slate-600 ml-2">{formatCurrency(product.sell_price)}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {canEditServices ? 'Select services to include in invoice. Changes will update the booking.' : ''}
                  </p>
                </div>
              )}

              {previewData && (
                <Card className="bg-slate-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">Customer</p>
                      <p className="font-semibold">{previewData.customer?.name}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">Services</p>
                      <div className="space-y-1">
                        {previewData.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.product_name}</span>
                            <span className="font-medium">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(previewData.subtotal)}</span>
                      </div>
                      
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-slate-600">Tax Bifurcation:</p>
                        {Object.entries(previewData.taxBreakdown).map(([name, data]) => (
                          <div key={name} className="flex justify-between text-xs text-slate-600">
                            <span>{name} ({data.percentage}%):</span>
                            <span>{formatCurrency(data.amount)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between text-sm mt-2">
                        <span>Total Tax:</span>
                        <span className="font-medium">{formatCurrency(previewData.totalTax)}</span>
                      </div>

                      {previewData.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount ({previewData.discountPercentage}%):</span>
                          <span className="font-medium">-{formatCurrency(previewData.discountAmount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-base font-bold mt-3 pt-3 border-t">
                        <span>Final Total:</span>
                        <span className="text-primary">{formatCurrency(previewData.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Discount Fields - Only for Admin and Manager */}
              {canEditServices ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount_percentage">Discount %</Label>
                    <Input
                      id="discount_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.discount_percentage}
                      onChange={(e) => handleDiscountPercentageChange(e.target.value)}
                      data-testid="invoice-discount-percentage-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_amount">Discount Amount</Label>
                    <Input
                      id="discount_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.discount_amount}
                      onChange={(e) => handleDiscountAmountChange(e.target.value)}
                      data-testid="invoice-discount-amount-input"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                    <p className="text-sm text-slate-500">
                      Only Admin and Manager can apply discounts
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="submit" className="rounded-full" data-testid="invoice-submit-button">
                  Generate Invoice & Download PDF
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoice Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-heading font-bold">Car Logic Car Wash</h2>
                <p className="text-lg font-semibold mt-2">INVOICE</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Invoice Number:</p>
                  <p>{getFullInvoiceNumber(selectedInvoice)}</p>
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

      {/* Email Invoice Modal */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email_address">Recipient Email (Customer Email)</Label>
              <Input
                id="email_address"
                type="email"
                placeholder="customer@example.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                data-testid="email-address-input"
                autoFocus
              />
              {selectedInvoice?.customer?.email && emailAddress === selectedInvoice.customer.email && (
                <p className="text-xs text-slate-500 mt-1">✓ Customer email (auto-filled)</p>
              )}
              {!selectedInvoice?.customer?.email && (
                <p className="text-xs text-slate-400 mt-1">Enter the customer's email address to send the invoice</p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleEmailInvoice} className="rounded-full" data-testid="send-email-button">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-slate-100 shadow-sm" data-testid="invoices-table-card">
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.invoice_id} data-testid={`invoice-row-${invoice.invoice_id}`}>
                  <TableCell className="font-medium">{getFullInvoiceNumber(invoice)}</TableCell>
                  <TableCell>{getCustomerName(invoice.customer_id)}</TableCell>
                  <TableCell className="hidden md:table-cell">{format(new Date(invoice.created_at), 'PPP')}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(invoice.invoice_id)}
                        data-testid={`preview-invoice-${invoice.invoice_id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const customer = customers.find(c => c.customer_id === invoice.customer_id);
                          setSelectedInvoice({ ...invoice, customer });
                          setEmailAddress(customer?.email || '');
                          setEmailOpen(true);
                        }}
                        data-testid={`email-invoice-${invoice.invoice_id}`}
                        title={(() => {
                          const customer = customers.find(c => c.customer_id === invoice.customer_id);
                          return customer?.email ? `Email to: ${customer.email}` : 'Email invoice to customer';
                        })()}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(invoice.invoice_id)}
                        data-testid={`download-invoice-${invoice.invoice_id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {invoices.length === 0 && (
            <p className="text-center text-slate-500 py-8">No invoices found. Generate your first invoice!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}