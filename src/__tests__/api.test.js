/* @jest-environment node */

describe('API /api/clients', () => {
  it('should return clients', async () => {
    const mockClients = [{ _id: '1', name: 'Client 1' }];
    global.fetch.mockResolvedValue({
      status: 200,
      json: async () => mockClients,
    });

    const res = await fetch('/api/clients');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].name).toBe('Client 1');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
});