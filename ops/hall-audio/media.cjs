'use strict';

const { AccessToken, RoomServiceClient, TrackSource } = require('livekit-server-sdk');

function permissions(publisher) {
  return { canSubscribe: !publisher, canPublish: publisher, canPublishData: false,
    canUpdateOwnMetadata: false,
    ...(publisher ? { canPublishSources: [TrackSource.MICROPHONE] } : {}) };
}

class LiveKitMedia {
  constructor(config, client) {
    this.config = config;
    this.client = client || new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret);
  }
  async cleanupOrphans(pattern) {
    const rooms = await this.client.listRooms();
    for (const room of rooms) if (pattern.test(room.name)) await this.client.deleteRoom(room.name);
  }
  async createRoom(name) {
    await this.client.createRoom({ name, emptyTimeout: 300, departureTimeout: 10 });
  }
  async issueToken({ room, identity, publisher, ttl }) {
    const token = new AccessToken(this.config.apiKey, this.config.apiSecret, { identity, ttl });
    token.addGrant({ roomJoin: true, room, ...permissions(publisher) });
    return token.toJwt();
  }
  async retireRoom(room, identity) {
    const missing = error => error?.status === 404 || error?.code === 'not_found' || error?.code === 'NOT_FOUND';
    if (identity) {
      try { await this.client.updateParticipant(room, identity, { permission: {
        canPublish: false, canSubscribe: false, canPublishData: false, canPublishSources: [],
      } }); } catch (error) { if (!missing(error)) throw error; }
      try { await this.client.removeParticipant(room, identity); }
      catch (error) { if (!missing(error)) throw error; }
    }
    try { await this.client.deleteRoom(room); }
    catch (error) { if (!missing(error)) throw error; }
  }
}

module.exports = { LiveKitMedia, permissions };
