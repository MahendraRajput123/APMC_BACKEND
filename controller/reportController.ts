import expressAsyncHandler from "express-async-handler";
import { Report } from "../models/reportModel";
import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiResponse";

// Get list of all report
const getReport = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      const report = await Report.find({});

      if (report) {
        res.status(200).json(
          new ApiResponse(200, report, "Successfully get all report data!")
        );
      }
    } catch (error: any) {
      res.status(400);
      throw new Error(error?.message);
    }
  }
);

// Add new report entry
const addReport = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const { numberPlateImg, vehicleImg, deviceName, vehicleType } = req.body;

    // console.log(numberPlateImg, vehicleImg, deviceName, vehicleType, "--------------------------from Api")

    if (numberPlateImg === undefined || numberPlateImg === "" || numberPlateImg === null || vehicleImg === undefined || vehicleImg === "" || vehicleImg === null || deviceName === undefined || deviceName === "" || deviceName === null || vehicleType === undefined || vehicleType === "" || vehicleType === null) {
      res.status(400);
      throw new Error(`All fields are mandatory!`);
    }


    const report = await Report.create({
      numberPlateImg,
      vehicleImg,
      deviceName,
      vehicleType,
      date : new Date()
    });

    if (report) {
      res.status(201).json(
        new ApiResponse(200, report, "Report added successfully!")
      );
    } else {
      res.status(400);
      throw new Error("Error creating Report!");
    }
  } catch (error: any) {
    res.status(400);
    throw new Error(error?.message);
  }
});

// Update the report
const updateReport = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { numberPlateImg, vehicleImg, deviceName, vehicleType } = req.body;

      if (!id) {
        res.status(400);
        throw new Error("Id is required to update!");
      }

      // Find existing name with same id and name
      const existingReport = await Report.findOne({
        _id: id,
      });

      if (!existingReport) {
        res.status(400);
        throw new Error("Report not found!");
      }

      const updateReport: any = {
        numberPlateImg: numberPlateImg ? numberPlateImg : existingReport.numberPlateImg,
        vehicleImg: vehicleImg ? vehicleImg : existingReport.vehicleImg,
        deviceName: deviceName ? deviceName : existingReport.deviceName,
        vehicleType: vehicleType ? vehicleType : existingReport.vehicleType,
        date: new Date()
      };

      // Update report details
      const report = await Report.findByIdAndUpdate(
        id,
        updateReport,
        {
          new: true,
        }
      );

      if (report) {
        res.status(200).json(
          new ApiResponse(200, report, "Successfully updated report data!")
        );
      } else {
        res.status(400);
        throw new Error("Error updating report!");
      }

    } catch (error: any) {
      res.status(400);
      throw new Error(error?.message);
    }
  }
);

// Delete the report
const deleteReport = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      const reportId = req.params.id;
      if (!reportId) {
        res.status(400);
        throw new Error(`reportId Id not found in params`);
      }

      const device = await Report.findById(reportId);

      if (!device) {
        res.status(400);
        throw new Error(`reportId not found`);
      } else {
        const deletedReport = await Report.findOneAndDelete({
          _id: reportId,
        });
        if (deletedReport) {
          res.status(200).json(
            new ApiResponse(200, deletedReport, "Successfully deleted device!")
          );
        }
      }
    } catch (error: any) {
      res.status(400);
      throw new Error(error?.message);
    }
  }
);

export { getReport, addReport, updateReport, deleteReport };