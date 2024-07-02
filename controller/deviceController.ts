import expressAsyncHandler from "express-async-handler";
import { Device } from "../models/deviceModel";
import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiResponse";
import ConnectDb from "../config/dbConnect";
import { OkPacket,RowDataPacket } from 'mysql2'; // Import OkPacket type if available

// Get list of all devices
const getDevices = async (req: Request, res: Response) => {
  try {
    const connection = await ConnectDb();

    const [rows]: [RowDataPacket[], any] = await connection.query('SELECT * FROM devices');

    if (rows.length > 0) {
      res.status(200).json(new ApiResponse(200, rows, 'Successfully get all devices data!'));
    } else {
      res.status(200).json(new ApiResponse(404, [], 'No devices found!'));
    }

    connection.end();
  } catch (error: any) {
    console.error('Error fetching devices:', error.message);
    res.status(500).json(new ApiResponse(500, [], 'Server Error'));
  }
};


// Add new device entry
const addDevices = async (req: Request, res: Response) => {
  try {
    const { name, source, status } = req.body;

    if (!name || !source || status === undefined || status === null) {
      res.status(400).json(new ApiResponse(400, {}, 'All fields are required!'));
      return;
    }

    const connection = await ConnectDb();

    // Check if the name or source already exists
    const [existing]: [RowDataPacket[], any] = await connection.query('SELECT * FROM devices WHERE name = ? OR source = ?', [name, source]);

    if (existing.length > 0) {
      res.status(400).json(new ApiResponse(400, {}, 'Name or Source already exists!'));
      connection.end();
      return;
    }

    // Proceed with insertion if no existing record is found
    const [result]: [OkPacket, any] = await connection.query('INSERT INTO devices (name, source, status) VALUES (?, ?, ?)', [name, source, status]);

    if (result && ('insertId' in result)) {
      const insertId = result.insertId;
      res.status(201).json(new ApiResponse(201, { id: insertId, name, source, status }, 'Device added successfully!'));
    } else {
      res.status(400).json(new ApiResponse(400, {}, 'Error creating Device'));
    }

    connection.end();
  } catch (error: any) {
    console.error('Error adding device:', error?.message);
    res.status(500).json(new ApiResponse(500, {}, 'Server Error'));
  }
};

// Update the device
const updateDevice = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { name, source, status } = req.body;

    if (!id || !name || !source || status === undefined || status === null) {
      res.status(400).json(new ApiResponse(400, {}, 'All fields are required!'));
      return;
    }

    const connection = await ConnectDb();

     // Check if the device exists
     const [existing]: [RowDataPacket[], any] = await connection.query('SELECT * FROM devices WHERE id = ?', [id]);

     if (existing.length === 0) {
       res.status(404).json(new ApiResponse(404, {}, 'Device not found!'));
       connection.end();
       return;
     }


   // Check if the name or source already exists excluding the current id
   const [existingRecord]: [RowDataPacket[], any] = await connection.query('SELECT * FROM devices WHERE (name = ? OR source = ?) AND id != ?', [name, source, id]);

    if (existingRecord.length > 0) {
      res.status(400).json(new ApiResponse(400, {}, 'Name or Source already exists!'));
      connection.end();
      return;
    }


    // Update device details
    const [result]: [OkPacket, any] = await connection.query(
      'UPDATE devices SET name = ?, source = ?, status = ? WHERE id = ?',
      [name, source, status, id]
    );

    if (result.affectedRows > 0) {
      res.status(200).json(new ApiResponse(200, { id, name, source, status }, 'Updated successufully'));
    } else {
      res.status(400).json(new ApiResponse(400, {}, 'Error updating Device'));
    }

    connection.end();
  } catch (error: any) {
    console.error('Error updating device:', error?.message);
    res.status(500).json(new ApiResponse(500, {}, error?.message));
  }
};


// Delete the device
const deleteDevice = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    if (!deviceId) {
      res.status(400).json(new ApiResponse(400, {}, 'Device ID not found in params'));
      return;
    }

    const connection = await ConnectDb();

    // Check if the device exists
    const [existing]: [RowDataPacket[], any] = await connection.query('SELECT * FROM devices WHERE id = ?', [deviceId]);

    if (existing.length === 0) {
      res.status(404).json(new ApiResponse(404, {}, 'Device not found'));
      connection.end();
      return;
    }

    // Delete the device
    const [result]: [OkPacket, any] = await connection.query('DELETE FROM devices WHERE id = ?', [deviceId]);

    if (result.affectedRows > 0) {
      res.status(200).json(new ApiResponse(200, {}, 'Successfully deleted device!'));
    } else {
      res.status(400).json(new ApiResponse(400, {}, 'Error deleting device'));
    }

    connection.end();
  } catch (error: any) {
    console.error('Error deleting device:', error.message);
    res.status(500).json(new ApiResponse(500, {}, 'Server Error'));
  }
};

export { getDevices, addDevices, updateDevice, deleteDevice };