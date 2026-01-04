import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Invite } from '../Invite.js';
import { query } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
vi.mock('../../config/database.js');
vi.mock('uuid', () => ({
  v4: vi.fn()
}));

describe('Invite Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create invite with default options', async () => {
      const mockToken = 'test-uuid-123';
      vi.mocked(uuidv4).mockReturnValue(mockToken);

      const mockInvite = {
        id: 1,
        token: mockToken,
        inviter_user_id: 5,
        max_uses: 1,
        use_count: 0,
        expires_at: new Date(),
        created_at: new Date()
      };

      query.mockResolvedValue({ rows: [mockInvite] });

      const result = await Invite.create(5);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invites'),
        [mockToken, 5, 1, expect.any(Date)]
      );
      expect(result).toEqual(mockInvite);
    });

    it('should create invite with custom options', async () => {
      const mockToken = 'custom-uuid';
      vi.mocked(uuidv4).mockReturnValue(mockToken);

      query.mockResolvedValue({ rows: [{ id: 1 }] });

      await Invite.create(5, { maxUses: 10, expiresHours: 168 });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invites'),
        [mockToken, 5, 10, expect.any(Date)]
      );
    });
  });

  describe('findByToken', () => {
    it('should return invite when found', async () => {
      const mockInvite = {
        id: 1,
        token: 'test-token',
        inviter_user_id: 5
      };

      query.mockResolvedValue({ rows: [mockInvite] });

      const result = await Invite.findByToken('test-token');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE token = $1'),
        ['test-token']
      );
      expect(result).toEqual(mockInvite);
    });

    it('should return null when invite not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await Invite.findByToken('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('validate', () => {
    it('should return valid invite', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockInvite = {
        id: 1,
        token: 'valid-token',
        max_uses: 5,
        use_count: 2,
        expires_at: futureDate
      };

      query.mockResolvedValue({ rows: [mockInvite] });

      const result = await Invite.validate('valid-token');

      expect(result).toEqual(mockInvite);
    });

    it('should return null for expired invite', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 24);

      const mockInvite = {
        id: 1,
        token: 'expired-token',
        max_uses: 5,
        use_count: 2,
        expires_at: pastDate
      };

      query.mockResolvedValue({ rows: [mockInvite] });

      const result = await Invite.validate('expired-token');

      expect(result).toBeNull();
    });

    it('should return null when max uses reached', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockInvite = {
        id: 1,
        token: 'fully-used-token',
        max_uses: 5,
        use_count: 5,
        expires_at: futureDate
      };

      query.mockResolvedValue({ rows: [mockInvite] });

      const result = await Invite.validate('fully-used-token');

      expect(result).toBeNull();
    });

    it('should return null when invite not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await Invite.validate('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('incrementUse', () => {
    it('should increment use count', async () => {
      query.mockResolvedValue({ rows: [{ use_count: 2 }] });

      const result = await Invite.incrementUse('test-token');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE invites'),
        ['test-token']
      );
      expect(result).toBe(2);
    });
  });

  describe('getInviteUrl', () => {
    it('should return deep link URL', () => {
      const url = Invite.getInviteUrl('abc-123');

      expect(url).toBe('mycircle://invite/abc-123');
    });
  });

  describe('getByInviter', () => {
    it('should return invites for user', async () => {
      const mockInvites = [
        { id: 1, token: 'token1' },
        { id: 2, token: 'token2' }
      ];

      query.mockResolvedValue({ rows: mockInvites });

      const result = await Invite.getByInviter(5);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE inviter_user_id = $1'),
        [5]
      );
      expect(result).toEqual(mockInvites);
    });
  });

  describe('cleanupExpired', () => {
    it('should delete expired invites and return count', async () => {
      query.mockResolvedValue({ rowCount: 5 });

      const result = await Invite.cleanupExpired();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM invites')
      );
      expect(result).toBe(5);
    });

    it('should return 0 when no expired invites', async () => {
      query.mockResolvedValue({ rowCount: 0 });

      const result = await Invite.cleanupExpired();

      expect(result).toBe(0);
    });
  });
});
