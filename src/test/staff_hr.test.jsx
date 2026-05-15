import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StaffHRView } from '../components/dashboard/Operations';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  CheckCircle2: () => <div data-testid="check-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  QrCode: () => <div data-testid="qr-code-icon" />,
  ShieldCheck: () => <div data-testid="shield-check-icon" />,
  Users2: () => <div data-testid="users2-icon" />,
  Copy: () => <div data-testid="copy-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  ArrowUpRight: () => <div data-testid="arrow-up-right-icon" />,
  Briefcase: () => <div data-testid="briefcase-icon" />,
  DollarSign: () => <div data-testid="dollar-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />
}));

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  functions: {}
}));

// Mock runtime config
vi.mock('../config/runtime', () => ({
  buildCaregiverInviteUrl: (url) => url,
  buildQrCodeUrl: (url) => url,
  getCaregiverInviteOrigin: () => 'http://localhost:5173',
  isLocalhostOrigin: () => true,
  saveCaregiverInviteOrigin: (o) => o
}));

describe('StaffHRView - Onboarding UI', () => {
  const mockHomeData = {
    id: 'test_home_123',
    staffList: [
      { email: 'pending@staff.com', status: 'pending', name: 'Pending Staff' },
      { email: 'onboarded@staff.com', status: 'onboarded', name: 'Onboarded Staff' },
      { email: 'active@staff.com', status: 'active', name: 'Active Staff' }
    ]
  };

  it('correctly counts active and pending staff including onboarded status', () => {
    render(<StaffHRView homeData={mockHomeData} />);
    
    // Onboarded (1) + Active (1) = 2 Active
    expect(screen.getByText('2 Active')).toBeTruthy();
    // Pending (1) = 1 Pending
    expect(screen.getByText('1 Pending')).toBeTruthy();
  });

  it('displays the correct badge for onboarded staff', () => {
    render(<StaffHRView homeData={mockHomeData} />);
    
    expect(screen.getByText('Onboarded')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Pending Acceptance')).toBeTruthy();
  });
});
