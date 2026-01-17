import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function TaxesPage() {
  const [taxes, setTaxes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [formData, setFormData] = useState({ name: '', percentage: '' });

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      const response = await axios.get(`${API}/taxes`);
      setTaxes(response.data);
    } catch (error) {
      toast.error('Failed to fetch taxes');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { name: formData.name, percentage: parseFloat(formData.percentage) };
      if (editingTax) {
        await axios.put(`${API}/taxes/${editingTax.tax_id}`, data);
        toast.success('Tax updated successfully');
      } else {
        await axios.post(`${API}/taxes`, data);
        toast.success('Tax created successfully');
      }
      setOpen(false);
      setEditingTax(null);
      setFormData({ name: '', percentage: '' });
      fetchTaxes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (tax) => {
    setEditingTax(tax);
    setFormData({ name: tax.name, percentage: tax.percentage.toString() });
    setOpen(true);
  };

  const handleDelete = async (taxId) => {
    if (!window.confirm('Are you sure you want to delete this tax?')) return;
    try {
      await axios.delete(`${API}/taxes/${taxId}`);
      toast.success('Tax deleted successfully');
      fetchTaxes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6" data-testid="taxes-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900" data-testid="taxes-title">Taxes</h1>
          <p className="text-slate-600 mt-1">Manage tax rates</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg shadow-primary/20" onClick={() => { setEditingTax(null); setFormData({ name: '', percentage: '' }); }} data-testid="add-tax-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Tax
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="tax-dialog">
            <DialogHeader>
              <DialogTitle>{editingTax ? 'Edit Tax' : 'Add Tax'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required data-testid="tax-name-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="percentage">Percentage *</Label>
                <Input id="percentage" type="number" step="0.01" value={formData.percentage} onChange={(e) => setFormData({ ...formData, percentage: e.target.value })} required data-testid="tax-percentage-input" />
              </div>
              <DialogFooter>
                <Button type="submit" className="rounded-full" data-testid="tax-submit-button">{editingTax ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-100 shadow-sm" data-testid="taxes-table-card">
        <CardHeader>
          <CardTitle>Tax List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxes.map((tax) => (
                <TableRow key={tax.tax_id} data-testid={`tax-row-${tax.tax_id}`}>
                  <TableCell className="font-medium">{tax.name}</TableCell>
                  <TableCell>{tax.percentage}%</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(tax)} data-testid={`edit-tax-${tax.tax_id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(tax.tax_id)} data-testid={`delete-tax-${tax.tax_id}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {taxes.length === 0 && (
            <p className="text-center text-slate-500 py-8">No taxes found. Add your first tax!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}