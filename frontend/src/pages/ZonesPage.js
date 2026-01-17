import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function ZonesPage() {
  const [zones, setZones] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({ name: '', is_active: true });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await axios.get(`${API}/zones`);
      setZones(response.data);
    } catch (error) {
      toast.error('Failed to fetch zones');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingZone) {
        await axios.put(`${API}/zones/${editingZone.zone_id}`, formData);
        toast.success('Zone updated successfully');
      } else {
        await axios.post(`${API}/zones`, formData);
        toast.success('Zone created successfully');
      }
      setOpen(false);
      setEditingZone(null);
      setFormData({ name: '', is_active: true });
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setFormData({ name: zone.name, is_active: zone.is_active });
    setOpen(true);
  };

  const handleDelete = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;
    try {
      await axios.delete(`${API}/zones/${zoneId}`);
      toast.success('Zone deleted successfully');
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const toggleZoneStatus = async (zone) => {
    try {
      await axios.put(`${API}/zones/${zone.zone_id}`, { name: zone.name, is_active: !zone.is_active });
      toast.success('Zone status updated');
      fetchZones();
    } catch (error) {
      toast.error('Failed to update zone status');
    }
  };

  return (
    <div className="space-y-6" data-testid="zones-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900" data-testid="zones-title">Wash Zones</h1>
          <p className="text-slate-600 mt-1">Manage wash zones and their availability</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg shadow-primary/20" onClick={() => { setEditingZone(null); setFormData({ name: '', is_active: true }); }} data-testid="add-zone-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="zone-dialog">
            <DialogHeader>
              <DialogTitle>{editingZone ? 'Edit Zone' : 'Add Zone'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required data-testid="zone-name-input" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  data-testid="zone-active-switch"
                />
                <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
              </div>
              <DialogFooter>
                <Button type="submit" className="rounded-full" data-testid="zone-submit-button">{editingZone ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-100 shadow-sm" data-testid="zones-table-card">
        <CardHeader>
          <CardTitle>Zone List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.zone_id} data-testid={`zone-row-${zone.zone_id}`}>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={zone.is_active}
                        onCheckedChange={() => toggleZoneStatus(zone)}
                        data-testid={`zone-toggle-${zone.zone_id}`}
                      />
                      <span className={`text-sm ${zone.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                        {zone.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(zone)} data-testid={`edit-zone-${zone.zone_id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(zone.zone_id)} data-testid={`delete-zone-${zone.zone_id}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {zones.length === 0 && (
            <p className="text-center text-slate-500 py-8">No zones found. Add your first wash zone!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}