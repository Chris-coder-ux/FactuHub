import { render, screen } from '@testing-library/react';
import Dashboard from '@/components/Dashboard';
import useSWR from 'swr';

// Mock SWR before importing anything that might use it
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
  mutate: jest.fn(),
}));

// Mock Recharts to avoid ResponsiveContainer warnings and circular dependency issues in JSDOM
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div style={{ width: '800px', height: '400px' }}>{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Area: () => <g />,
  XAxis: () => <g />,
  YAxis: () => <g />,
  CartesianGrid: () => <g />,
  Tooltip: () => <div />,
}));

describe('Dashboard', () => {
  it('renders dashboard title after loading', async () => {
    // Mocking both SWR calls in Dashboard
    (useSWR as jest.Mock).mockReturnValue({
      data: {
        totalRevenue: 1000,
        clientCount: 10,
        pendingInvoices: 5,
        monthlyRevenue: 200,
      },
      error: null,
      isLoading: false,
    });

    render(<Dashboard />);
    
    // Check for the "Dashboard" heading
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    
    // Check for the new charts card title
    expect(screen.getByText('Resumen de Ingresos')).toBeInTheDocument();
    
    // Check for a stat value
    expect(screen.getByText('$1000')).toBeInTheDocument();
  });

  it('renders loading state via skeletons', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
    });

    const { container } = render(<Dashboard />);
    
    // Skeletons have the animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
});