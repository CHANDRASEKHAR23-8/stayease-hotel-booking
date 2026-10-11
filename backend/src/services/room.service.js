import roomRepository from '../repositories/room.repository.js';
import hotelRepository from '../repositories/hotel.repository.js';
import { ApiError } from '../utils/apiResponse.js';

class RoomService {
  /**
   * Get rooms for a hotel
   */
  async getRoomsForHotel(hotelId, requestingUser = null) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    const isOwner = requestingUser && Number(requestingUser.id) === Number(hotel.owner_id);
    const isAdmin = requestingUser && requestingUser.role === 'admin';

    if (hotel.status !== 'approved' && !isOwner && !isAdmin) {
      throw ApiError.notFound('Hotel not found or is currently not available');
    }

    // Owners and admins can see inactive rooms; public sees only active rooms
    const activeOnly = !isOwner && !isAdmin;
    return roomRepository.findByHotelId(hotelId, activeOnly);
  }

  /**
   * Owner: Create a room under owner's hotel
   */
  async createRoom(ownerId, hotelId, roomData) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    if (Number(hotel.owner_id) !== Number(ownerId)) {
      throw ApiError.forbidden('You do not have permission to add rooms to this hotel');
    }

    return roomRepository.create({
      ...roomData,
      hotel_id: hotelId
    });
  }

  /**
   * Owner: Update an existing room
   */
  async updateRoom(ownerId, roomId, updateData) {
    const room = await roomRepository.findById(roomId);
    if (!room) {
      throw ApiError.notFound('Room not found');
    }

    const hotel = await hotelRepository.findById(room.hotel_id);
    if (!hotel || Number(hotel.owner_id) !== Number(ownerId)) {
      throw ApiError.forbidden('You do not have permission to modify this room');
    }

    return roomRepository.update(roomId, updateData);
  }

  /**
   * Owner: Deactivate a room
   */
  async deactivateRoom(ownerId, roomId) {
    const room = await roomRepository.findById(roomId);
    if (!room) {
      throw ApiError.notFound('Room not found');
    }

    const hotel = await hotelRepository.findById(room.hotel_id);
    if (!hotel || Number(hotel.owner_id) !== Number(ownerId)) {
      throw ApiError.forbidden('You do not have permission to deactivate this room');
    }

    return roomRepository.deactivate(roomId);
  }

  /**
   * Owner: Upload and associate image with room
   */
  async addRoomImage(ownerId, roomId, imageUrl, caption = '', isPrimary = false) {
    const room = await roomRepository.findById(roomId);
    if (!room) {
      throw ApiError.notFound('Room not found');
    }

    const hotel = await hotelRepository.findById(room.hotel_id);
    if (!hotel || Number(hotel.owner_id) !== Number(ownerId)) {
      throw ApiError.forbidden('You do not have permission to upload images for this room');
    }

    return roomRepository.addImage(roomId, imageUrl, caption, isPrimary);
  }
}

export default new RoomService();
