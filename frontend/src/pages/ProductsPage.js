import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

export default function ProductsPage() {
  const { formatCurrency } = useSettings();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', category_id: '', tax_ids: [], buy_price: '', sell_price: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchTaxes();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to fetch products');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchTaxes = async () => {
    try {
      const response = await axios.get(`${API}/taxes`);
      setTaxes(response.data);
    } catch (error) {
      console.error('Failed to fetch taxes', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        code: formData.code,
        category_id: formData.category_id,
        tax_ids: formData.tax_ids,
        buy_price: formData.buy_price ? parseFloat(formData.buy_price) : null,
        sell_price: parseFloat(formData.sell_price)
      };
      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.product_id}`, data);
        toast.success('Product updated successfully');
      } else {
        await axios.post(`${API}/products`, data);
        toast.success('Product created successfully');
      }
      setOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', code: '', category_id: '', tax_ids: [], buy_price: '', sell_price: '' });
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      code: product.code,
      category_id: product.category_id,
      tax_ids: product.tax_ids || [],
      buy_price: product.buy_price?.toString() || '',
      sell_price: product.sell_price.toString()
    });
    setOpen(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await axios.delete(`${API}/products/${productId}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const toggleTax = (taxId) => {
    setFormData(prev => ({
      ...prev,
      tax_ids: prev.tax_ids.includes(taxId)
        ? prev.tax_ids.filter(id => id !== taxId)
        : [...prev.tax_ids, taxId]
    }));
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.category_id === categoryId);
    return category?.name || '-';
  };

  return (
    <div className="space-y-6" data-testid="products-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900" data-testid="products-title">Products</h1>
          <p className="text-slate-600 mt-1">Manage car wash services and products</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg shadow-primary/20" onClick={() => { setEditingProduct(null); setFormData({ name: '', code: '', category_id: '', tax_ids: [], buy_price: '', sell_price: '' }); }} data-testid="add-product-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="product-dialog">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required data-testid="product-name-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required data-testid="product-code-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })} required>
                  <SelectTrigger data-testid="product-category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.category_id} value={category.category_id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Taxes</Label>
                <div className="space-y-2 border rounded-lg p-4 max-h-32 overflow-y-auto">
                  {taxes.map((tax) => (
                    <div key={tax.tax_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tax.tax_id}
                        checked={formData.tax_ids.includes(tax.tax_id)}
                        onCheckedChange={() => toggleTax(tax.tax_id)}
                        data-testid={`tax-checkbox-${tax.tax_id}`}
                      />
                      <Label htmlFor={tax.tax_id} className="font-normal cursor-pointer">{tax.name} ({tax.percentage}%)</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buy_price">Buy Price (Optional)</Label>
                  <Input id="buy_price" type="number" step="0.01" value={formData.buy_price} onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })} data-testid="product-buy-price-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sell_price">Sell Price *</Label>
                  <Input id="sell_price" type="number" step="0.01" value={formData.sell_price} onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })} required data-testid="product-sell-price-input" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="rounded-full" data-testid="product-submit-button">{editingProduct ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-100 shadow-sm" data-testid="products-table-card">
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Buy Price</TableHead>
                <TableHead>Sell Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.product_id} data-testid={`product-row-${product.product_id}`}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.code}</TableCell>
                  <TableCell>{getCategoryName(product.category_id)}</TableCell>
                  <TableCell>{product.buy_price ? formatCurrency(product.buy_price) : '-'}</TableCell>
                  <TableCell>{formatCurrency(product.sell_price)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(product)} data-testid={`edit-product-${product.product_id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(product.product_id)} data-testid={`delete-product-${product.product_id}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {products.length === 0 && (
            <p className="text-center text-slate-500 py-8">No products found. Add your first product!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}