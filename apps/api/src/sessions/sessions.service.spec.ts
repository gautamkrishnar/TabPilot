import 'reflect-metadata';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { type Connection, connect, type Model } from 'mongoose';
import type { CreateSessionDto } from './dto/create-session.dto';
import { SessionDoc, SessionSchema } from './session.schema';
import { SessionsService } from './sessions.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const defaultDto: CreateSessionDto = {
  name: 'Test Session',
  hostName: 'Host User',
  hostEmail: 'host@example.com',
  urls: ['https://example.com', 'https://other.com'],
  expiryDays: 7,
  votingEnabled: false,
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JOIN_CODE_REGEX = /^[A-Z2-9]{6}$/;

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('SessionsService', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let service: SessionsService;
  let sessionModel: Model<SessionDoc>;
  let module: TestingModule;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: SessionDoc.name, schema: SessionSchema }]),
      ],
      providers: [SessionsService],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    sessionModel = module.get<Model<SessionDoc>>(getModelToken(SessionDoc.name));
  });

  afterAll(async () => {
    await module.close();
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await sessionModel.deleteMany({});
  });

  // -------------------------------------------------------------------------
  // create()
  // -------------------------------------------------------------------------
  describe('create()', () => {
    it('should create a session with a valid sessionId in UUID format', async () => {
      const { session } = await service.create(defaultDto);
      expect(session.id).toMatch(UUID_REGEX);
    });

    it('should generate a 6-character uppercase alphanumeric joinCode', async () => {
      const { session } = await service.create(defaultDto);
      expect(session.joinCode).toMatch(JOIN_CODE_REGEX);
    });

    it('should return a raw hostKey that is a non-empty string', async () => {
      const { hostKey } = await service.create(defaultDto);
      expect(typeof hostKey).toBe('string');
      expect(hostKey.length).toBeGreaterThan(0);
    });

    it('should store a hashed hostKeyHash that is not equal to the raw key', async () => {
      const { session, hostKey } = await service.create(defaultDto);
      const doc = await sessionModel.findOne({ sessionId: session.id });
      expect(doc).not.toBeNull();
      expect(doc?.hostKeyHash).not.toBe(hostKey);
    });

    it('should set state to "waiting"', async () => {
      const { session } = await service.create(defaultDto);
      expect(session.state).toBe('waiting');
    });

    it('should set currentIndex to 0', async () => {
      const { session } = await service.create(defaultDto);
      expect(session.currentIndex).toBe(0);
    });

    it('should correctly compute expiresAt based on expiryDays', async () => {
      const before = new Date();
      const { session } = await service.create({ ...defaultDto, expiryDays: 3 });
      const after = new Date();

      const expiresAt = new Date(session.expiresAt);
      const expectedMin = new Date(before);
      expectedMin.setDate(expectedMin.getDate() + 3);
      const expectedMax = new Date(after);
      expectedMax.setDate(expectedMax.getDate() + 3);

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + 1000);
    });
  });

  // -------------------------------------------------------------------------
  // findById()
  // -------------------------------------------------------------------------
  describe('findById()', () => {
    it('should return the session document by sessionId', async () => {
      const { session } = await service.create(defaultDto);
      const found = await service.findById(session.id);
      expect(found).not.toBeNull();
      expect(found?.sessionId).toBe(session.id);
    });

    it('should return null for a nonexistent sessionId', async () => {
      const found = await service.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findByJoinCode()
  // -------------------------------------------------------------------------
  describe('findByJoinCode()', () => {
    it('should return the session by join code', async () => {
      const { session } = await service.create(defaultDto);
      const found = await service.findByJoinCode(session.joinCode);
      expect(found).not.toBeNull();
      expect(found?.sessionId).toBe(session.id);
    });

    it('should return the session using a lowercase join code (case-insensitive)', async () => {
      const { session } = await service.create(defaultDto);
      const found = await service.findByJoinCode(session.joinCode.toLowerCase());
      expect(found).not.toBeNull();
      expect(found?.sessionId).toBe(session.id);
    });

    it('should return null for a wrong code', async () => {
      await service.create(defaultDto);
      const found = await service.findByJoinCode('XXXXXX');
      expect(found).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // validateHostKey()
  // -------------------------------------------------------------------------
  describe('validateHostKey()', () => {
    it('should return true for the correct host key', async () => {
      const { session, hostKey } = await service.create(defaultDto);
      const valid = await service.validateHostKey(session.id, hostKey);
      expect(valid).toBe(true);
    });

    it('should return false for a wrong key', async () => {
      const { session } = await service.create(defaultDto);
      const valid = await service.validateHostKey(session.id, 'wrong-key');
      expect(valid).toBe(false);
    });

    it('should return false for a nonexistent sessionId', async () => {
      const valid = await service.validateHostKey(
        '00000000-0000-0000-0000-000000000000',
        'any-key',
      );
      expect(valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // updateState()
  // -------------------------------------------------------------------------
  describe('updateState()', () => {
    it('should update state from waiting → active', async () => {
      const { session } = await service.create(defaultDto);
      const updated = await service.updateState(session.id, 'active');
      expect(updated.state).toBe('active');
    });

    it('should update state from active → ended', async () => {
      const { session } = await service.create(defaultDto);
      await service.updateState(session.id, 'active');
      const updated = await service.updateState(session.id, 'ended');
      expect(updated.state).toBe('ended');
    });
  });

  // -------------------------------------------------------------------------
  // updateCurrentIndex()
  // -------------------------------------------------------------------------
  describe('updateCurrentIndex()', () => {
    it('should update currentIndex', async () => {
      const { session } = await service.create(defaultDto);
      const updated = await service.updateCurrentIndex(session.id, 1);
      expect(updated.currentIndex).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // setLocked()
  // -------------------------------------------------------------------------
  describe('setLocked()', () => {
    it('should set isLocked to true', async () => {
      const { session } = await service.create(defaultDto);
      const updated = await service.setLocked(session.id, true);
      expect(updated?.isLocked).toBe(true);
    });

    it('should set isLocked back to false', async () => {
      const { session } = await service.create(defaultDto);
      await service.setLocked(session.id, true);
      const updated = await service.setLocked(session.id, false);
      expect(updated?.isLocked).toBe(false);
    });

    it('should return null for a nonexistent sessionId', async () => {
      const result = await service.setLocked('00000000-0000-0000-0000-000000000000', true);
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // addUrl()
  // -------------------------------------------------------------------------
  describe('addUrl()', () => {
    it('should append a URL to the urls array', async () => {
      const { session } = await service.create(defaultDto);
      const updated = await service.addUrl(session.id, 'https://added.com');
      expect(updated?.urls).toContain('https://added.com');
      expect(updated?.urls).toHaveLength(defaultDto.urls.length + 1);
    });

    it('should return null for a nonexistent sessionId', async () => {
      const result = await service.addUrl('00000000-0000-0000-0000-000000000000', 'https://x.com');
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // removeUrl()
  // -------------------------------------------------------------------------
  describe('removeUrl()', () => {
    it('should remove the URL at the given index', async () => {
      const { session } = await service.create(defaultDto);
      const updated = await service.removeUrl(session.id, 0);
      expect(updated?.urls).not.toContain(defaultDto.urls[0]);
      expect(updated?.urls).toHaveLength(defaultDto.urls.length - 1);
    });

    it('should return null for an out-of-bounds index', async () => {
      const { session } = await service.create(defaultDto);
      const result = await service.removeUrl(session.id, 999);
      expect(result).toBeNull();
    });

    it('should clamp currentIndex when the current URL is removed', async () => {
      const { session } = await service.create(defaultDto);
      // Advance to last URL (index 1) then remove it
      await service.updateCurrentIndex(session.id, 1);
      const updated = await service.removeUrl(session.id, 1);
      // After removing index 1 the only remaining URL is at index 0
      expect(updated?.currentIndex).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // reorderUrls()
  // -------------------------------------------------------------------------
  describe('reorderUrls()', () => {
    it('should reorder URLs when both indices are strictly after currentIndex', async () => {
      // Create a session with three URLs so we can reorder indices 1 and 2
      const { session } = await service.create({
        ...defaultDto,
        urls: ['https://a.com', 'https://b.com', 'https://c.com'],
      });
      // Start at index 0 so indices 1 and 2 are future items
      const updated = await service.reorderUrls(session.id, 1, 2);
      // b and c should have swapped
      expect(updated?.urls[1]).toBe('https://c.com');
      expect(updated?.urls[2]).toBe('https://b.com');
    });

    it('should return the unchanged document when fromIndex equals toIndex', async () => {
      const { session } = await service.create(defaultDto);
      const updated = await service.reorderUrls(session.id, 1, 1);
      expect(updated?.urls).toEqual(defaultDto.urls);
    });

    it('should return null for a nonexistent sessionId', async () => {
      const result = await service.reorderUrls('00000000-0000-0000-0000-000000000000', 0, 1);
      expect(result).toBeNull();
    });
  });
});
