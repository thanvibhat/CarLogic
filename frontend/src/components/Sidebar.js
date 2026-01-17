import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../App';
import { Car, LayoutDashboard, Users, Package, FolderTree, Receipt, MapPin, Calendar, FileText, UserCog, Menu, X, BarChart3, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../hooks/useTheme';

export default function Sidebar() {
  const { user } = useAuth();
  const { theme, currentTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const isFancy = theme === 'fancy';

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/categories', label: 'Categories', icon: FolderTree },
    { path: '/taxes', label: 'Taxes', icon: Receipt },
    { path: '/zones', label: 'Wash Zones', icon: MapPin },
    { path: '/bookings', label: 'Bookings', icon: Calendar },
    { path: '/invoices', label: 'Invoices', icon: FileText },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  if (user?.role === 'Admin') {
    navItems.push({ path: '/settings', label: 'Settings', icon: Settings });
    navItems.push({ path: '/users', label: 'Users', icon: UserCog });
  }

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className={`md:hidden fixed top-4 left-4 z-50 ${isFancy ? 'text-white' : ''}`}
        onClick={toggleSidebar}
        data-testid="mobile-menu-toggle"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={closeSidebar}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-64 ${currentTheme.classes.sidebar} flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        data-testid="sidebar"
      >
        <div className={`p-6 ${isFancy ? 'border-b border-white/10' : 'border-b border-slate-200'}`}>
          <div className="flex items-center space-x-3">
            <div className={`${isFancy ? 'bg-gradient-to-br from-blue-400 to-purple-500' : 'bg-primary'} text-white p-2 rounded-lg`} data-testid="sidebar-logo">
              <Car size={24} />
            </div>
            <div>
              <h1 className={`text-xl font-heading font-bold ${isFancy ? 'text-white' : 'text-slate-900'}`}>Car Logic</h1>
              <p className={`text-xs ${isFancy ? 'text-white/70' : 'text-slate-600'}`}>Car Wash Manager</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" data-testid="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 ${currentTheme.classes.button} transition-all duration-200 ${
                    isActive
                      ? isFancy 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                        : 'bg-primary text-white shadow-lg shadow-primary/20'
                      : isFancy
                        ? 'text-white/80 hover:bg-white/10'
                        : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
                data-testid={`nav-link-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}