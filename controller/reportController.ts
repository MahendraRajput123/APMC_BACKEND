import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import mysql, { OkPacket, RowDataPacket } from "mysql2/promise";
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


async function runDuplicateRemoval() {
  try {
    const result = await removeDuplicateReports();
    // console.log(result, '-------------------------------------Remove duplications');
  } catch (error) {
    console.error('Error in duplicate removal job:', error);
  }
}

// Run every 5 minutes
setInterval(runDuplicateRemoval, 5 * 60 * 1000);

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

async function deleteImageFile(imageUrl: string) {
  try {
    const urlParts = new URL(imageUrl);
    const relativePath = urlParts.pathname.replace('/uploads/', '');
    const absolutePath = path.join(__dirname, '..', 'uploads', relativePath);

    if (await fs.pathExists(absolutePath)) {
      await fs.unlink(absolutePath);
      // console.log(`Deleted image: ${absolutePath}`);
    } else {
      console.log(`Image not found: ${absolutePath}`);
    }
  } catch (error) {
    console.error(`Error deleting image ${imageUrl}:`, error);
  }
}

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

// Add new report entry
const addReport = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const { numberPlateImg, vehicleImg, deviceName, vehicleType, numberPlate } = req.body;

    if (!numberPlateImg || !vehicleImg || !deviceName || !vehicleType || !numberPlate) {
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
      'INSERT INTO report (numberPlateImg, vehicleImg, deviceName, vehicleType, date, numberPlate) VALUES (?, ?, ?, ?, ?, ?)',
      [numberPlateImageUrl, vehicleImageUrl, deviceName, vehicleType, new Date(), numberPlate]
    );

    connection.end();

    if ((result as any).affectedRows > 0) {
      res.status(201).json(
        new ApiResponse(201, { id: (result as any).insertId, numberPlateImageUrl, vehicleImageUrl, deviceName, vehicleType, numberPlate }, "Report added successfully!")
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


const deleteReports = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const reportIds: string[] = req.body.reportIds;
    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      res.status(400).json(new ApiResponse(400, {}, 'Invalid or empty reportIds array in request body'));
      return;
    }

    const connection = await ConnectDb();

    // Fetch image URLs before deleting records
    const [imageUrls] = await connection.query(
      'SELECT numberPlateImg, vehicleImg FROM report WHERE id IN (?)',
      [reportIds]
    );

    // Delete the reports
    const [result] = await connection.query('DELETE FROM report WHERE id IN (?)', [reportIds]);

    connection.end();

    if ((result as any).affectedRows > 0) {
      // Delete image files
      for (const row of imageUrls as any[]) {
        await deleteImageFile(row.numberPlateImg);
        await deleteImageFile(row.vehicleImg);
      }

      res.status(200).json(new ApiResponse(200, { deletedCount: (result as any).affectedRows }, 'Successfully deleted reports and associated images!'));
    } else {
      res.status(404).json(new ApiResponse(404, {}, 'No matching reports found to delete'));
    }
  } catch (error: any) {
    console.error('Error deleting reports:', error.message);
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
        .text(`Id: ${i + 1}`, 50, yOffset);

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

async function removeDuplicateReports() {
  let connection;
  try {
    connection = await ConnectDb();

    // Step 1: Get today's data
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await connection.query(
      'SELECT id, numberPlate, date, vehicleType, deviceName, numberPlateImg, vehicleImg FROM report WHERE DATE(date) = ? ORDER BY date DESC',
      [today]
    );

    if ((rows as any[]).length === 0) {
      return { message: "No reports found for today!", removedDuplicates: 0, remainingEntries: 0 };
    }

    // Step 2: Identify duplicates
    const duplicates: { id: number, numberPlateImg: string, vehicleImg: string }[] = [];
    const uniqueEntries: { [key: string]: any } = {};

    (rows as any[]).forEach((row) => {
      // Group by 5-minute intervals
      const timeGroup = Math.floor(row.date.getTime() / (5 * 60 * 1000));
      const key = `${row.numberPlate}_${timeGroup}_${row.vehicleType}_${row.deviceName}`;
      
      if (uniqueEntries[key]) {
        // If this entry is newer, keep it and mark the older one as duplicate
        if (row.date > uniqueEntries[key].date) {
          duplicates.push({
            id: uniqueEntries[key].id,
            numberPlateImg: uniqueEntries[key].numberPlateImg,
            vehicleImg: uniqueEntries[key].vehicleImg
          });
          uniqueEntries[key] = row;
        } else {
          duplicates.push({
            id: row.id,
            numberPlateImg: row.numberPlateImg,
            vehicleImg: row.vehicleImg
          });
        }
      } else {
        uniqueEntries[key] = row;
      }
    });

    // Step 3: Remove duplicates from database
    if (duplicates.length > 0) {
      const duplicateIds = duplicates.map(d => d.id);
      const [deleteResult] = await connection.query(
        'DELETE FROM report WHERE id IN (?)',
        [duplicateIds]
      );

      // Step 4: Delete associated image files
      for (const duplicate of duplicates) {
        await deleteImageFile(duplicate.numberPlateImg);
        await deleteImageFile(duplicate.vehicleImg);
      }

      return {
        message: "Successfully removed duplicate reports and associated images!",
        removedDuplicates: (deleteResult as any).affectedRows,
        remainingEntries: Object.keys(uniqueEntries).length
      };
    } else {
      return {
        message: "No duplicates found!",
        removedDuplicates: 0,
        remainingEntries: Object.keys(uniqueEntries).length
      };
    }
  } catch (error: any) {
    console.error('Error removing duplicate reports:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export { getReport, addReport, updateReport, deleteReport, deleteReports, generatePDFReport, insertReportData, getReportSummary, removeDuplicateReports };