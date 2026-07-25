import 'reflect-metadata';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { type Connection, connect, type Model } from 'mongoose';
import { ParticipantDoc, ParticipantSchema } from './participant.schema';
import { ParticipantsService } from './participants.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Use real UUID-format session IDs so findBySession's UUID guard accepts them
const SESSION_1 = '00000000-0000-0000-0000-000000000001';
const SESSION_2 = '00000000-0000-0000-0000-000000000002';

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('ParticipantsService', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let service: ParticipantsService;
  let participantModel: Model<ParticipantDoc>;
  let module: TestingModule;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: ParticipantDoc.name, schema: ParticipantSchema }]),
      ],
      providers: [ParticipantsService],
    }).compile();

    service = module.get<ParticipantsService>(ParticipantsService);
    participantModel = module.get<Model<ParticipantDoc>>(getModelToken(ParticipantDoc.name));
  });

  afterAll(async () => {
    await module.close();
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await participantModel.deleteMany({});
  });

  // -------------------------------------------------------------------------
  // create()
  // -------------------------------------------------------------------------
  describe('create()', () => {
    it('should create a participant with a UUID participantId', async () => {
      const participant = await service.create(SESSION_1, 'Alice');
      expect(participant.id).toMatch(UUID_REGEX);
    });

    it('should generate a DiceBear avatar URL containing the participantId as seed', async () => {
      const participant = await service.create(SESSION_1, 'Alice');
      expect(participant.avatarUrl).toContain(participant.id);
      expect(participant.avatarUrl).toContain('dicebear.com');
    });

    it('should set isOnline to false initially', async () => {
      const participant = await service.create(SESSION_1, 'Alice');
      expect(participant.isOnline).toBe(false);
    });

    it('should store the correct sessionId', async () => {
      const participant = await service.create('session-42', 'Bob');
      expect(participant.sessionId).toBe('session-42');
    });

    it('should store the name', async () => {
      const participant = await service.create(SESSION_1, 'Alice');
      expect(participant.name).toBe('Alice');
    });

    it('should store optional email when provided', async () => {
      const participant = await service.create(SESSION_1, 'Alice', 'alice@example.com');
      expect(participant.email).toBe('alice@example.com');
    });
  });

  // -------------------------------------------------------------------------
  // findById()
  // -------------------------------------------------------------------------
  describe('findById()', () => {
    it('should find a participant by participantId', async () => {
      const created = await service.create(SESSION_1, 'Alice');
      const found = await service.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.participantId).toBe(created.id);
    });

    it('should return null for a nonexistent participantId', async () => {
      const found = await service.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });

    it('should return null for a non-UUID participantId', async () => {
      const found = await service.findById('not-a-uuid');
      expect(found).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findBySession()
  // -------------------------------------------------------------------------
  describe('findBySession()', () => {
    it('should return all participants for a session', async () => {
      await service.create(SESSION_1, 'Alice');
      await service.create(SESSION_1, 'Bob');
      const participants = await service.findBySession(SESSION_1);
      expect(participants).toHaveLength(2);
    });

    it('should not return participants from a different session', async () => {
      await service.create(SESSION_1, 'Alice');
      await service.create(SESSION_2, 'Bob');
      const participants = await service.findBySession(SESSION_1);
      expect(participants).toHaveLength(1);
      expect(participants[0].name).toBe('Alice');
    });

    it('should return an empty array for a session with no participants', async () => {
      const participants = await service.findBySession('00000000-0000-0000-0000-000000000099');
      expect(participants).toHaveLength(0);
    });

    it('should return an empty array for a non-UUID sessionId', async () => {
      const participants = await service.findBySession('not-a-uuid');
      expect(participants).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // updateOnlineStatus()
  // -------------------------------------------------------------------------
  describe('updateOnlineStatus()', () => {
    it('should set isOnline to true', async () => {
      const created = await service.create(SESSION_1, 'Alice');
      const updated = await service.updateOnlineStatus(created.id, true);
      expect(updated.isOnline).toBe(true);
    });

    it('should set isOnline to false', async () => {
      const created = await service.create(SESSION_1, 'Alice');
      await service.updateOnlineStatus(created.id, true);
      const updated = await service.updateOnlineStatus(created.id, false);
      expect(updated.isOnline).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // updateSocketId()
  // -------------------------------------------------------------------------
  describe('updateSocketId()', () => {
    it('should update the socketId field', async () => {
      const created = await service.create(SESSION_1, 'Alice');
      const updated = await service.updateSocketId(created.id, 'socket-xyz');
      expect(updated.socketId).toBe('socket-xyz');
    });
  });

  // -------------------------------------------------------------------------
  // updateProfile()
  // -------------------------------------------------------------------------
  describe('updateProfile()', () => {
    it('should update the name', async () => {
      const created = await service.create(SESSION_1, 'Alice');
      const updated = await service.updateProfile(created.id, 'Alicia');
      expect(updated.name).toBe('Alicia');
    });

    it('should set email when provided', async () => {
      const created = await service.create(SESSION_1, 'Alice');
      const updated = await service.updateProfile(created.id, 'Alice', 'alice@example.com');
      expect(updated.email).toBe('alice@example.com');
    });

    it('should clear email when empty string is passed', async () => {
      const created = await service.create(SESSION_1, 'Alice', 'alice@example.com');
      const updated = await service.updateProfile(created.id, 'Alice', '');
      expect(updated.email).toBeNull();
    });

    it('should throw NotFoundException for an unknown participantId', async () => {
      await expect(
        service.updateProfile('00000000-0000-0000-0000-000000000000', 'Ghost'),
      ).rejects.toThrow('not found');
    });
  });

  // -------------------------------------------------------------------------
  // deleteParticipant()
  // -------------------------------------------------------------------------
  describe('deleteParticipant()', () => {
    it('should remove the participant so findById returns null afterwards', async () => {
      const created = await service.create(SESSION_1, 'Alice');
      await service.deleteParticipant(created.id);
      const found = await service.findById(created.id);
      expect(found).toBeNull();
    });

    it('should remove only the targeted participant, leaving others intact', async () => {
      const alice = await service.create(SESSION_1, 'Alice');
      const bob = await service.create(SESSION_1, 'Bob');
      await service.deleteParticipant(alice.id);
      const remaining = await service.findBySession(SESSION_1);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(bob.id);
    });

    it('should be a no-op for a nonexistent participantId', async () => {
      await expect(
        service.deleteParticipant('00000000-0000-0000-0000-000000000000'),
      ).resolves.not.toThrow();
    });
  });

  describe('deleteAllForSession()', () => {
    it('removes all participants belonging to the session', async () => {
      await service.create(SESSION_1, 'Alice');
      await service.create(SESSION_1, 'Bob');
      await service.deleteAllForSession(SESSION_1);
      expect(await service.findBySession(SESSION_1)).toHaveLength(0);
    });

    it('does not remove participants from other sessions', async () => {
      const SESSION_2 = '00000000-0000-0000-0000-000000000002';
      await service.create(SESSION_1, 'Alice');
      await service.create(SESSION_2, 'Bob');
      await service.deleteAllForSession(SESSION_1);
      expect(await service.findBySession(SESSION_2)).toHaveLength(1);
    });

    it('is a no-op when no participants exist for the session', async () => {
      await expect(
        service.deleteAllForSession('00000000-0000-0000-0000-000000000099'),
      ).resolves.not.toThrow();
    });
  });
});
