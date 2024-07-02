import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiResponse";
import ConnectDb from "../config/dbConnect";
import { OkPacket,RowDataPacket } from 'mysql2'; // Import OkPacket type if available

// Get list of all connections
const getConnections = async (req: Request, res: Response) => {
  try {
    const connection = await ConnectDb();

    const [rows]: [RowDataPacket[], any] = await connection.query('SELECT * FROM connections');

    if (rows.length > 0) {
      res.status(200).json(new ApiResponse(200, rows, 'Successfully get all connections data!'));
    } else {
      res.status(404).json(new ApiResponse(404, [], 'No connections found!'));
    }

    connection.end();
  } catch (error: any) {
    console.error('Error fetching connections:', error.message);
    res.status(500).json(new ApiResponse(500, [], 'Server Error'));
  }
};

// Get connection
const getConnection = async (req: Request, res: Response) => {
  try {
    const connection = await ConnectDb();

    const [rows]: [RowDataPacket[], any] = await connection.query('SELECT * FROM connections WHERE status = 1');

    if (rows.length > 0) {
      res.status(200).json(new ApiResponse(200, rows, 'Successfully get all connections data!'));
    } else {
      res.status(404).json(new ApiResponse(404, [], 'No connections found!'));
    }

    connection.end();
  } catch (error: any) {
    console.error('Error fetching connections:', error.message);
    res.status(500).json(new ApiResponse(500, [], 'Server Error'));
  }
};


// Add new connection entry
const addConnection = async (req: Request, res: Response) => {
  try {
    const { deviceName, status } = req.body;

    if (!deviceName || status === null) {
      res.status(400).json(new ApiResponse(400, {}, 'All fields are required!'));
      return;
    }

    const connection = await ConnectDb();

    // Insert new connection
    const [result]: [OkPacket, any] = await connection.query('INSERT INTO connections (deviceName, status, startDate, endDate) VALUES (?, ?, ?, ?)', [deviceName, status,new Date(),new Date()]);

    if (result && ('insertId' in result)) {
      const insertId = result.insertId;
      res.status(201).json(new ApiResponse(201, { id: insertId, deviceName, status }, 'Connection added successfully!'));
    } else {
      res.status(400).json(new ApiResponse(400, {}, 'Error Connection Device'));
    }

    connection.end();
  } catch (error: any) {
    console.error('Error adding device:', error?.message);
    res.status(500).json(new ApiResponse(500, {}, 'Server Error'));
  }
};

// Update the connection
const updateConnection = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { deviceName, status } = req.body;

    if (!deviceName || status === undefined || status === null) {
      res.status(400).json(new ApiResponse(400, {}, 'All fields are required!'));
      return;
    }

    const connection = await ConnectDb();

    // Update device details
    const [result]: [OkPacket, any] = await connection.query(
      'UPDATE connections SET deviceName = ?, status = ?, endDate = ? WHERE id = ?',
      [deviceName, status,new Date(), id]
    );

    if (result.affectedRows > 0) {
      res.status(200).json(new ApiResponse(200, { id, deviceName, status }, 'Successfully updated Connection data!'));
    } else {
      res.status(400).json(new ApiResponse(400, {}, 'Error updating Connection'));
    }

    connection.end();
  } catch (error: any) {
    console.error('Error updating Connection:', error?.message);
    res.status(500).json(new ApiResponse(500, {}, error?.message));
  }
};


// Delete the Connection
const deleteConnection = async (req: Request, res: Response) => {
  try {
    const connectionId = req.params.id;
    if (!connectionId) {
      res.status(400).json(new ApiResponse(400, {}, 'Connection ID not found in params'));
      return;
    }

    const connection = await ConnectDb();

    // Update Connection details
    const [result]: [OkPacket, any] = await connection.query(
      'UPDATE connections SET  status = ?, endDate = ? WHERE id = ?',
      [ 0, new Date(), connectionId]
    );

    if (result.affectedRows > 0) {
      res.status(200).json(new ApiResponse(200, result, 'Successfully updated Connection data!'));
    } else {
      res.status(400).json(new ApiResponse(400, {}, 'Error updating Connection'));
    }

    connection.end();
  } catch (error: any) {
    console.error('Error deleting Connection:', error.message);
    res.status(500).json(new ApiResponse(500, {}, 'Server Error'));
  }
};

export { getConnections, addConnection, updateConnection, deleteConnection, getConnection };