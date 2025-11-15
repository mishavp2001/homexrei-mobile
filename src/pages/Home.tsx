import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import Landing from './Landing';
import { Loader2 } from 'lucide-react';

export const isPublic = true;

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser) {
          // User is logged in, redirect to dashboard
          setIsAuthenticated(true);
          navigate(createPageUrl('Dashboard'));
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        // User not logged in, show landing
        setIsAuthenticated(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  // Don't render Landing if user is authenticated and about to be redirected
  if (isAuthenticated) {
    return null;
  }

  return <Landing />;
}