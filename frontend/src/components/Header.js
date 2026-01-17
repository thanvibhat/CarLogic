import React from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { LogOut, User, Palette, Check } from 'lucide-react';
import { useTheme, themes } from '../hooks/useTheme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme, currentTheme } = useTheme();

  const headerClass = currentTheme.classes.header;
  const isLightHeader = theme !== 'fancy';

  return (
    <header className={`${headerClass} px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10`} data-testid="header">
      <div className="ml-12 md:ml-0">
        <h2 className={`text-lg md:text-xl font-heading font-bold ${isLightHeader ? 'text-slate-900' : 'text-white'}`}>
          Welcome, {user?.name}
        </h2>
        <p className={`text-xs md:text-sm ${isLightHeader ? 'text-slate-600' : 'text-white/80'}`}>{user?.role}</p>
      </div>
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Theme Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={isLightHeader ? "outline" : "secondary"}
              size="sm"
              className={`${currentTheme.classes.button} ${!isLightHeader ? 'bg-white/20 hover:bg-white/30 text-white border-white/30' : ''}`}
              data-testid="theme-switcher"
            >
              <Palette className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{currentTheme.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>UI Design</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(themes).map(([key, value]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => setTheme(key)}
                className="cursor-pointer flex items-center justify-between"
                data-testid={`theme-option-${key}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{value.icon}</span>
                  <div>
                    <p className="font-medium">{value.name}</p>
                    <p className="text-xs text-slate-500">{value.description}</p>
                  </div>
                </div>
                {theme === key && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className={`hidden sm:flex items-center space-x-2 px-3 md:px-4 py-2 ${isLightHeader ? 'bg-slate-50' : 'bg-white/20'} rounded-full`} data-testid="user-info">
          <User className={`h-4 w-4 ${isLightHeader ? 'text-slate-600' : 'text-white'}`} />
          <span className={`text-xs md:text-sm font-medium ${isLightHeader ? 'text-slate-700' : 'text-white'}`}>{user?.email}</span>
        </div>
        <Button
          variant={isLightHeader ? "outline" : "secondary"}
          size="sm"
          className={`${currentTheme.classes.button} ${!isLightHeader ? 'bg-white/20 hover:bg-white/30 text-white border-white/30' : ''}`}
          onClick={logout}
          data-testid="logout-button"
        >
          <LogOut className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}