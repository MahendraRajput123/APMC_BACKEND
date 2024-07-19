import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiResponse";
import ConnectDb from "../config/dbConnect";
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
const os = require('os');

// Get the IPv4 address
const ipAddress = getIPv4Address();

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

const getDashboardSettings = expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const connection = await ConnectDb();
      const [rows] = await connection.query('SELECT * FROM dashboardSettings LIMIT 1');
      
      if ((rows as any[]).length > 0) {
        res.status(200).json(
          new ApiResponse(200, (rows as any[])[0], "Successfully got dashboard settings!")
        );
      } else {
        res.status(404).json(
          new ApiResponse(404, {}, "No dashboard settings found!")
        );
      }
      connection.end();
    } catch (error: any) {
      console.error('Error fetching dashboard settings:', error.message);
      res.status(500).json(new ApiResponse(500, {}, 'Server Error'));
    }
  });
  
  // Add or update dashboard settings
  const upsertDashboardSettings = expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const { logo, logoText } = req.body;
  
      if (!logo || !logoText) {
        res.status(400).json(new ApiResponse(400, {}, 'ALl fields are required!'));
        return;
      }
  
      // Save image
      const logoFileName = await saveBase64Image(logo, 'logos');
      const logoUrl = `http://${ipAddress}:${process.env.PORT || 8000}/uploads/logos/${logoFileName}`;
  
      const connection = await ConnectDb();
      
      // Check if settings already exist
      const [existingSettings] = await connection.query('SELECT * FROM dashboardSettings LIMIT 1');
  
      let result;
      if ((existingSettings as any[]).length > 0) {
        // Update existing settings
        [result] = await connection.query(
          'UPDATE dashboardSettings SET logo = ?, logoText = ? WHERE id = ?',
          [logoUrl, logoText, (existingSettings as any[])[0].id]
        );
      } else {
        // Insert new settings
        [result] = await connection.query(
          'INSERT INTO dashboardSettings (logo, logoText) VALUES (?, ?)',
          [logoUrl, logoText]
        );
      }
  
      connection.end();
  
      if ((result as any).affectedRows > 0) {
        res.status(200).json(
          new ApiResponse(200, { logo: logoUrl, logoText }, "Dashboard settings updated successfully!")
        );
      } else {
        res.status(400).json(new ApiResponse(400, {}, "Error updating dashboard settings!"));
      }
    } catch (error: any) {
      console.error('Error updating dashboard settings:', error.message);
      res.status(500).json(new ApiResponse(500, {}, 'Server Error'));
    }
  });
  
  // Delete dashboard settings
  const deleteDashboardSettings = expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const connection = await ConnectDb();
  
      // First, get all dashboard settings to find logo URLs
      const [settings] = await connection.query('SELECT * FROM dashboardSettings');
  
      // Delete all dashboard settings from the database
      const [result] = await connection.query('DELETE FROM dashboardSettings');
  
      // Close the database connection
      connection.end();
  
      // If settings were found and deleted, remove the associated logo files
      if ((settings as any[]).length > 0) {
        const logoFolder = path.join(__dirname, '..', 'uploads', 'logos');
  
        for (const setting of settings as any[]) {
          if (setting.logo) {
            const logoFileName = path.basename(new URL(setting.logo).pathname);
            const logoPath = path.join(logoFolder, logoFileName);
  
            // Remove the logo file if it exists
            if (await fs.pathExists(logoPath)) {
              await fs.remove(logoPath);
              console.log(`Deleted logo file: ${logoPath}`);
            }
          }
        }
      }
  
      if ((result as any).affectedRows > 0) {
        res.status(200).json(new ApiResponse(200, {}, 'Successfully deleted dashboard settings and associated logo files!'));
      } else {
        res.status(404).json(new ApiResponse(404, {}, 'No dashboard settings found to delete'));
      }
    } catch (error: any) {
      console.error('Error deleting dashboard settings:', error.message);
      res.status(500).json(new ApiResponse(500, {}, 'Server Error'));
    }
  });

export { getDashboardSettings, upsertDashboardSettings, deleteDashboardSettings };