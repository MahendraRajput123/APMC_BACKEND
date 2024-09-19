import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import mysql, {OkPacket, RowDataPacket } from "mysql2/promise";
import { ApiResponse } from "../utils/apiResponse";
import ConnectDb from "../config/dbConnect";
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
const os = require('os');
import PDFDocument from 'pdfkit';
import axios from 'axios';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

// Add variable to keep track of last time called removeDuplicateReports function
let lastRemoveDuplicatesTime: number = 0;

// Get the IPv4 address
const ipAddress = getIPv4Address();

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

// Function to save base64 image
const saveBase64Image = async (base64Data: string, folderName: string): Promise<string> => {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const imageBuffer = Buffer.from(matches[2], 'base64');
  const fileExtension = matches[1].split('/')[1];
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = path.join(__dirname, '..', 'uploads', folderName, fileName);

  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, imageBuffer);

  return fileName;
};

// Function to get the IPv4 address
function getIPv4Address() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '0.0.0.0'; // Default fallback
}

// Add new report entry
const addReport = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const { numberPlateImg, vehicleImg, deviceName, vehicleType, numberPlate,originalNumberPlate } = req.body;

    if (!numberPlateImg || !vehicleImg || !deviceName || !vehicleType || !numberPlate || !originalNumberPlate) {
      res.status(400).json(new ApiResponse(400, {}, 'All fields are mandatory!'));
      return;
    }

    // Save images
    const numberPlateImgFileName = await saveBase64Image(numberPlateImg, 'numberPlates');
    const vehicleImgFileName = await saveBase64Image(vehicleImg, 'vehicles');

    const numberPlateImageUrl = `http://localhost:${process.env.PORT || 8000}/uploads/numberPlates/${numberPlateImgFileName}`;
    const vehicleImageUrl = `http://localhost:${process.env.PORT || 8000}/uploads/vehicles/${vehicleImgFileName}`;

    const connection = await ConnectDb();
    const [result] = await connection.query(
      'INSERT INTO report (numberPlateImg, vehicleImg, deviceName, vehicleType, date, numberPlate, originalNumberPlate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [numberPlateImageUrl, vehicleImageUrl, deviceName, vehicleType, new Date(),numberPlate,originalNumberPlate]
    );

    connection.end();

    if ((result as any).affectedRows > 0) {
       // Check if it's been more than 5 minutes since last removeDuplicateReports call
       const currentTime = Date.now();
       if (currentTime - lastRemoveDuplicatesTime >= 5 * 60 * 1000) {
        // It's been 5 minutes or more, so call removeDuplicateReports
        try {
          const response = await axios.get('http://localhost:8000/api/report/remove-duplicate');
          console.log(response.data, "-------------------------------------Remove duplications");
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error("Error removing duplicates:", error.response?.data || error.message);
          } else {
            console.error("Unexpected error:", error);
          }
        }
      }else{
        console.log("-------------------------------------------------------------------diff is less than 5 min")
      }
       
      res.status(201).json(
        new ApiResponse(201, { id: (result as any).insertId, numberPlateImageUrl, vehicleImageUrl, deviceName, vehicleType,numberPlate }, "Report added successfully!")
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
    const { numberPlateImg, vehicleImg, deviceName, vehicleType, numberPlate } = req.body;

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
      numberPlate: numberPlate ? numberPlate : (existingReport as any)[0].numberPlate,
      date: new Date()
    };

    // Update report details
    const [result] = await connection.query(
      'UPDATE report SET numberPlateImg = ?, vehicleImg = ?, deviceName = ?, vehicleType = ?, date = ? numberPlate = ? WHERE id = ?',
      [updateReport.numberPlateImg, updateReport.vehicleImg, updateReport.deviceName, updateReport.vehicleType, updateReport.date,updateReport.numberPlate, id]
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

// Generate PDF report
const generatePDFReport = expressAsyncHandler(async (req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>, next: Function): Promise<void> => {
  try {
    const { Ids }: { Ids: number[] } = req.body;
    const connection = await ConnectDb();

    let query = 'SELECT * FROM report';
    let params: any[] = [];
    
    if (Ids && Array.isArray(Ids) && Ids.length > 0) {
      query += ' WHERE id IN (' + Ids.map(() => '?').join(',') + ')';
      params = Ids;
    }
    
    query += ' ORDER BY date DESC';
    const [rows]: any[] = await connection.query(query, params);
    connection.end();

    if ((rows as any[]).length === 0) {
      res.status(404).json(new ApiResponse(404, [], "No reports found!"));
      return;
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    doc.pipe(res);

    const itemsPerPage = 3;
    const formatDate = (date: string) => new Date(date).toLocaleString();

    for (let i = 0; i < (rows as any[])?.length; i++) {
      if (i % itemsPerPage === 0 && i !== 0) {
        doc.addPage();
      }

      const item = rows[i];
      const yOffset = 50 + ((i % itemsPerPage) * 250);

      doc.fontSize(14).font('Helvetica-Bold')
         .text(`Id: ${item.id}`, 50, yOffset);
      
      doc.fontSize(12).font('Helvetica')
         .text(`Camera Name: ${item.deviceName}`, 50, yOffset + 25)
         .text(`Number Plate: ${item.numberPlate}`, 50, yOffset + 45)
         .text(`Date & Time: ${formatDate(item.date)}`, 50, yOffset + 65)
         .text(`Vehicle Type: ${item.vehicleType}`, 50, yOffset + 85);

      try {
        const [numberPlateImg, vehicleImg] = await Promise.all([
          axios.get(item.numberPlateImg, { responseType: 'arraybuffer' }),
          axios.get(item.vehicleImg, { responseType: 'arraybuffer' })
        ]);

        doc.image(numberPlateImg.data, 50, yOffset + 110, { width: 200 });
        doc.image(vehicleImg.data, 300, yOffset + 110, { width: 200 });
      } catch (error) {
        console.error(`Failed to add image for item ${i}:`, error);
        doc.text(`Image load failed for ID: ${item.id}`, 50, yOffset + 110);
      }

      if (i < (rows as any[]).length - 1) {
        doc.moveTo(50, yOffset + 240).lineTo(550, yOffset + 240).stroke();
      }
    }

    doc.end();
  } catch (error: any) {
    console.error('Error generating PDF report:', error.message);
    res.status(500).json(new ApiResponse(500, [], 'Server Error'));
  }
});

// Function to generate a random number plate
const generateRandomPlate = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `GJ0A${randomNum}`;
};

// Insert report data for the years 2023, 2024, and 2025
const insertReportData = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const connection = await ConnectDb();
    const numberPlateImgBase = "http://localhost:8000/uploads/numberPlates/";
    const vehicleImgBase = "http://localhost:8000/uploads/vehicles/";
    const vehicleType = "4 Wheeler";
    const deviceName = "Daskrol_ANPR";

    for (let year = 2023; year <= 2025; year++) {
      for (let month = 1; month <= 12; month++) {
        const date = new Date(year, month - 1, 1).toISOString().slice(0, 19).replace('T', ' ');
        const numberPlateImg = numberPlateImgBase + "c3466368-8009-4921-a429-54b1b035c53d.jpeg"
        const vehicleImg = vehicleImgBase + "8231ec16-7722-47a9-ac6c-81404c21f9f4.webp";
        const numberPlate = generateRandomPlate();

        const [result]: [OkPacket, any] = await connection.query(
          'INSERT INTO report (date, numberPlateImg, vehicleImg, vehicleType, deviceName, numberPlate) VALUES (?, ?, ?, ?, ?, ?)',
          [date, numberPlateImg, vehicleImg, vehicleType, deviceName, numberPlate]
        );

        if (!result || !result.insertId) {
          res.status(400).json(new ApiResponse(400, {}, 'Error inserting report data into MySQL'));
          return;
        }
      }
    }

    connection.end();
    res.status(201).json(new ApiResponse(201, {}, 'Report data inserted successfully!'));
  } catch (error: any) {
    console.error('Error inserting report data:', error.message);
    res.status(500).json(new ApiResponse(500, {}, 'Server Error'));
  }
});

// Fetch and format report summary
const getReportSummary = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const connection = await ConnectDb();
    const [rows] = await connection.query('SELECT * FROM report');
    connection.end();

    if ((rows as any[]).length > 0) {
      const reportSummary = formatReportSummary(rows as any[]);
      res.status(200).json(
        new ApiResponse(200, reportSummary, "Successfully got all report data!")
      );
    } else {
      res.status(404).json(
        new ApiResponse(404, [], "No reports found!")
      );
    }
  } catch (error: any) {
    console.error('Error fetching reports:', error.message);
    res.status(500).json(new ApiResponse(500, [], 'Server Error'));
  }
});

// Format report data into the required structure
const formatReportSummary = (reports: any[]): any[] => {
  const summary: { [key: string]: any } = {};

  reports.forEach(report => {
    const date = new Date(report.date);
    const year = date.getFullYear();
    const month = date.toLocaleString('default', { month: 'long' });
    const deviceName = report.deviceName;

    if (!summary[year]) {
      summary[year] = {
        TotalMonths: [],
        totalReportsByDevice: []
      };
    }

    // Increment month value
    const monthEntry = summary[year].TotalMonths.find((m: any) => m.month === month);
    if (monthEntry) {
      monthEntry.value += 1;
    } else {
      summary[year].TotalMonths.push({ month, value: 1 });
    }

    // Increment device count
    const deviceEntry = summary[year].totalReportsByDevice.find((d: any) => d.deviceName === deviceName);
    if (deviceEntry) {
      deviceEntry.count += 1;
    } else {
      summary[year].totalReportsByDevice.push({ deviceName, count: 1, percentage: 0 });
    }
  });

  // Calculate percentages
  Object.keys(summary).forEach(year => {
    const totalReports = summary[year].totalReportsByDevice.reduce((sum: number, device: any) => sum + device.count, 0);
    summary[year].totalReportsByDevice.forEach((device: any) => {
      device.percentage = (device.count / totalReports) * 100;
    });
  });

  return [summary];
};

const removeDuplicateReports = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const connection = await ConnectDb();
    // Update the last time removeDuplicateReports was called
    lastRemoveDuplicatesTime = Date.now();

    // Step 1: Get today's data
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await connection.query(
      'SELECT id, numberPlate, date FROM report WHERE DATE(date) = ? ORDER BY date',
      [today]
    );

    if ((rows as any[]).length === 0) {
      res.status(404).json(new ApiResponse(404, [], "No reports found for today!"));
      return;
    }

    // Step 2: Identify duplicates
    const duplicates: number[] = [];
    const uniqueEntries: { [key: string]: any } = {};

    (rows as any[]).forEach((row, index) => {
      const key = `${row.numberPlate}_${Math.floor(row.date.getTime() / 60000)}`;
      if (uniqueEntries[key]) {
        duplicates.push(row.id);
      } else {
        uniqueEntries[key] = row;
      }
    });

    // Step 3: Remove duplicates
    if (duplicates.length > 0) {
      const [deleteResult] = await connection.query(
        'DELETE FROM report WHERE id IN (?)',
        [duplicates]
      );

      res.status(200).json(
        new ApiResponse(200, { 
          removedDuplicates: (deleteResult as any).affectedRows,
          remainingEntries: Object.keys(uniqueEntries).length
        }, "Successfully removed duplicate reports!")
      );
    } else {
      res.status(200).json(
        new ApiResponse(200, { 
          removedDuplicates: 0,
          remainingEntries: Object.keys(uniqueEntries).length
        }, "No duplicates found!")
      );
    }

    connection.end();
  } catch (error: any) {
    console.error('Error removing duplicate reports:', error.message);
    res.status(500).json(new ApiResponse(500, [], 'Server Error'));
  }
});

export { getReport, addReport, updateReport, deleteReport, generatePDFReport,insertReportData,getReportSummary, removeDuplicateReports };