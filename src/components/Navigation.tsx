import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Menu, X, LogOut, User, MessageSquare, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function Navigation({ user, actionButton }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get unread message count for logged in users
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadMessages', user?.email],
    queryFn: async () => {
      if (!user) return 0;
      const messages = await base44.entities.Message.list();
      const received = messages.filter(m => 
        m.recipient_email === user.email && !m.is_read
      );
      return received.length;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  // Check if user is a service provider
  const { data: isProvider = false } = useQuery({
    queryKey: ['isProvider', user?.email],
    queryFn: async () => {
      if (!user) return false;
      const services = await base44.entities.ServiceListing.filter({ expert_email: user.email });
      return services.length > 0;
    },
    enabled: !!user
  });

  const handleLogout = () => {
    base44.auth.logout(window.location.origin + createPageUrl('Landing'));
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.origin + createPageUrl('Dashboard'));
  };

  const isActive = (pageName) => {
    const currentPath = location.pathname.toLowerCase();
    const pageNameLower = pageName.toLowerCase();
    
    return currentPath.endsWith(`/${pageNameLower}`) || 
           currentPath.includes(`/${pageNameLower}?`) ||
           currentPath === `/${pageNameLower}` ||
           (currentPath === '/' && pageNameLower === 'landing');
  };

  const navLinkClass = (pageName) => {
    return isActive(pageName)
      ? 'text-[#1e3a5f] font-semibold border-b-2 border-[#d4af37] pb-1 transition-colors'
      : 'text-gray-700 hover:text-[#1e3a5f] font-medium transition-colors';
  };

  const mobileNavLinkClass = (pageName) => {
    return isActive(pageName)
      ? 'block text-[#1e3a5f] font-bold py-2 bg-[#d4af37]/10 px-3 rounded-lg transition-colors'
      : 'block text-gray-700 hover:text-[#1e3a5f] font-medium py-2 transition-colors';
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl(user ? 'Dashboard' : 'Landing')} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#1e3a5f]">HomeXREI</span>
            </Link>
            
            {/* Action Button (moved here) */}
            {actionButton && (
              <div className="hidden md:block">
                {actionButton}
              </div>
            )}
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6 flex-shrink-0">
            {user && (
              <Link to={createPageUrl('Dashboard')} className={navLinkClass('Dashboard')}>
                Dashboard
              </Link>
            )}
            <Link to={createPageUrl('Deals')} className={navLinkClass('Deals')}>
              Deals
            </Link>
            <Link to={createPageUrl('Services')} className={navLinkClass('Services')}>
              Services
            </Link>
            <Link to={createPageUrl('Insights')} className={navLinkClass('Insights')}>
              Insights
            </Link>
            
            {user ? (
              <>
                <Link to={createPageUrl('Messages')} className="relative flex-shrink-0">
                  <Button 
                    variant={isActive('Messages') ? 'default' : 'outline'} 
                    size="sm"
                    className={isActive('Messages') ? 'bg-[#1e3a5f] hover:bg-[#2a4a7f]' : ''}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Messages
                    {unreadCount > 0 && (
                      <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                {isProvider && (
                  <Link to={createPageUrl('ProviderBilling')} className="flex-shrink-0">
                    <Button 
                      variant={isActive('ProviderBilling') ? 'default' : 'outline'} 
                      size="sm"
                      className={isActive('ProviderBilling') ? 'bg-[#d4af37] hover:bg-[#c49d2a]' : ''}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Billing
                    </Button>
                  </Link>
                )}
                <Link to={createPageUrl('Profile')} className="flex-shrink-0">
                  <Button 
                    variant={isActive('Profile') ? 'default' : 'outline'} 
                    size="sm"
                    className={isActive('Profile') ? 'bg-[#1e3a5f] hover:bg-[#2a4a7f]' : ''}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout} className="flex-shrink-0">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleLogin} className="flex-shrink-0">
                  Sign In
                </Button>
                <Link to={createPageUrl('PropertyCapture')} className="flex-shrink-0">
                  <Button className="bg-[#d4af37] hover:bg-[#c49d2a]">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex-shrink-0 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-3">
            {/* Action Button in mobile menu */}
            {actionButton && (
              <div className="pb-3 border-b">
                {actionButton}
              </div>
            )}
            
            {user && (
              <Link 
                to={createPageUrl('Dashboard')} 
                className={mobileNavLinkClass('Dashboard')}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            )}
            <Link 
              to={createPageUrl('Deals')} 
              className={mobileNavLinkClass('Deals')}
              onClick={() => setMobileMenuOpen(false)}
            >
              Deals
            </Link>
            <Link 
              to={createPageUrl('Services')} 
              className={mobileNavLinkClass('Services')}
              onClick={() => setMobileMenuOpen(false)}
            >
              Services
            </Link>
            <Link 
              to={createPageUrl('Insights')} 
              className={mobileNavLinkClass('Insights')}
              onClick={() => setMobileMenuOpen(false)}
            >
              Insights
            </Link>
            
            {user ? (
              <>
                <Link to={createPageUrl('Messages')} onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant={isActive('Messages') ? 'default' : 'outline'} 
                    className={`w-full ${isActive('Messages') ? 'bg-[#1e3a5f] hover:bg-[#2a4a7f]' : ''}`}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Messages
                    {unreadCount > 0 && (
                      <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>
                    )}
                  </Button>
                </Link>
                {isProvider && (
                  <Link to={createPageUrl('ProviderBilling')} onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={isActive('ProviderBilling') ? 'default' : 'outline'} 
                      className={`w-full ${isActive('ProviderBilling') ? 'bg-[#d4af37] hover:bg-[#c49d2a]' : ''}`}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Billing
                    </Button>
                  </Link>
                )}
                <Link to={createPageUrl('Profile')} onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant={isActive('Profile') ? 'default' : 'outline'} 
                    className={`w-full ${isActive('Profile') ? 'bg-[#1e3a5f] hover:bg-[#2a4a7f]' : ''}`}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="w-full" onClick={handleLogin}>
                  Sign In
                </Button>
                <Link to={createPageUrl('PropertyCapture')} onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-[#d4af37] hover:bg-[#c49d2a]">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}