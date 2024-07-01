import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import mysql, { RowDataPacket } from "mysql2/promise";
import { ApiResponse } from "../utils/apiResponse";
import ConnectDb from "../config/dbConnect";

// Get list of all reports
const getReport = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const connection = await ConnectDb();
    const [rows] = await connection.query('SELECT * FROM report');
        
    if ((rows as any[]).length > 0) {
      res.status(200).json(
        new ApiResponse(200, rows, "Successfully got all report data!")
        );
      } else {
        res.status(404).json(
          new ApiResponse(404, [], "No reports found!")
          );
        }
    connection.end();
  } catch (error: any) {
    console.error('Error fetching reports:', error.message);
    res.status(500).json(new ApiResponse(500, [], 'Server Error'));
  }
});

// Add new report entry
const addReport = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const { numberPlateImg, vehicleImg, deviceName, vehicleType } = req.body;

    if (!numberPlateImg || !vehicleImg || !deviceName || !vehicleType) {
      res.status(400).json(new ApiResponse(400, {}, 'All fields are mandatory!'));
      return;
    }

    const connection = await ConnectDb();
    const [result] = await connection.query(
      'INSERT INTO report (numberPlateImg, vehicleImg, deviceName, vehicleType, date) VALUES (?, ?, ?, ?, ?)',
      [numberPlateImg, vehicleImg, deviceName, vehicleType, new Date()]
    );

    connection.end();

    if ((result as any).affectedRows > 0) {
      res.status(201).json(
        new ApiResponse(201, { id: (result as any).insertId, numberPlateImg, vehicleImg, deviceName, vehicleType }, "Report added successfully!")
      );
    } else {
      res.status(400).json(new ApiResponse(400, {}, "Error creating Report!"));
    }
  } catch (error: any) {
    console.error('Error adding report:', error.message);
    res.status(500).json(new ApiResponse(500, {}, 'Server Error'));
  }
});

// Update the report
const updateReport = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { numberPlateImg, vehicleImg, deviceName, vehicleType } = req.body;

    if (!id) {
      res.status(400).json(new ApiResponse(400, {}, "Id is required to update!"));
      return;
    }

    const connection = await ConnectDb();
    
    // Check if the report exists
    const [existingReport] = await connection.query('SELECT * FROM report WHERE id = ?', [id]);

    if ((existingReport as any[]).length === 0) {
      res.status(404).json(new ApiResponse(404, {}, "Report not found!"));
      connection.end();
      return;
    }

    const updateReport = {
      numberPlateImg: numberPlateImg ? numberPlateImg : (existingReport as any)[0].numberPlateImg,
      vehicleImg: vehicleImg ? vehicleImg : (existingReport as any)[0].vehicleImg,
      deviceName: deviceName ? deviceName : (existingReport as any)[0].deviceName,
      vehicleType: vehicleType ? vehicleType : (existingReport as any)[0].vehicleType,
      date: new Date()
    };

    // Update report details
    const [result] = await connection.query(
      'UPDATE report SET numberPlateImg = ?, vehicleImg = ?, deviceName = ?, vehicleType = ?, date = ? WHERE id = ?',
      [updateReport.numberPlateImg, updateReport.vehicleImg, updateReport.deviceName, updateReport.vehicleType, updateReport.date, id]
    );

    connection.end();

    if ((result as any).affectedRows > 0) {
      res.status(200).json(
        new ApiResponse(200, { id, ...updateReport }, "Successfully updated report data!")
      );
    } else {
      res.status(400).json(new ApiResponse(400, {}, "Error updating report!"));
    }
  } catch (error: any) {
    console.error('Error updating report:', error.message);
    res.status(500).json(new ApiResponse(500, {}, 'Server Error'));
  }
});

// Delete the report
const deleteReport = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const reportId = req.params.id;
    if (!reportId) {
      res.status(400).json(new ApiResponse(400, {}, 'Report ID not found in params'));
      return;
    }

    const connection = await ConnectDb();

    // Check if the report exists
    const [existingReport] = await connection.query('SELECT * FROM report WHERE id = ?', [reportId]);

    if ((existingReport as any[]).length === 0) {
      res.status(404).json(new ApiResponse(404, {}, 'Report not found'));
      connection.end();
      return;
    }

    // Delete the report
    const [result] = await connection.query('DELETE FROM report WHERE id = ?', [reportId]);

    connection.end();

    if ((result as any).affectedRows > 0) {
      res.status(200).json(new ApiResponse(200, {}, 'Successfully deleted report!'));
    } else {
      res.status(400).json(new ApiResponse(400, {}, 'Error deleting report'));
    }
  } catch (error: any) {
    console.error('Error deleting report:', error.message);
    res.status(500).json(new ApiResponse(500, {}, 'Server Error'));
  }
});

export { getReport, addReport, updateReport, deleteReport };
