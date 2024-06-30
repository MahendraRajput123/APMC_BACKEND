import expressAsyncHandler from "express-async-handler";
import { Device } from "../models/deviceModel";
import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiResponse";

// Get list of all devices
const getDevices = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      const devices = await Device.find({});

      if (devices) {
        res.status(200).json(
          new ApiResponse(200, devices, "Successfully get all devices data!")
        );
      }
    } catch (error: any) {
      res.status(400);
      throw new Error(error?.message);
    }
  }
);

// Add new device entry
const addDevices = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    console.log(name, "--------------------------from Api")

    if (name === undefined || name === "" || name === null) {
      res.status(400);
      throw new Error(`All fields are mandatory!`);
    }

    // Find device with existing type
    const existingDevice = await Device.findOne({
      name,
    });

    if (existingDevice) {
      res.status(400);
      throw new Error(`device name already exists!`);
    }

    const device = await Device.create({
      name,
    });

    if (device) {
      res.status(201).json(
        new ApiResponse(200, { _id: device.id, name: device.name }, "Device added successfully!")
      );
    } else {
      res.status(400);
      throw new Error("Error creating Device");
    }
  } catch (error: any) {
    res.status(400);
    throw new Error(error?.message);
  }
});

// Update the device
const updateDevice = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { name } = req.body;

      if (!id) {
        res.status(400);
        throw new Error("Id is required to update!");
      }

      // Find existing name with same id and name
      const existingName = await Device.findOne({
        _id: id,
        name,
      });

      console.log(existingName)
      if (existingName) {
        res.status(400);
        throw new Error("Same name already exists!.");
      }

      const updateDevice: any = {
        name,
      };

      // Update device details
      const device = await Device.findByIdAndUpdate(
        id,
        updateDevice,
        {
          new: true,
        }
      );

      if (device) {
        res.status(200).json(
          new ApiResponse(200, device, "Successfully updated device data!")
        );
      } else {
        res.status(400);
        throw new Error("Error updating device!");
      }

    } catch (error: any) {
      res.status(400);
      throw new Error(error?.message);
    }
  }
);

// Delete the device
const deleteDevice = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      const deviceId = req.params.id;
      if (!deviceId) {
        res.status(400);
        throw new Error(`deviceId Id not found in params`);
      }

      const device = await Device.findById(deviceId);

      if (!device) {
        res.status(400);
        throw new Error(`device not found`);
      } else {
        const deletedDeviceId = await Device.findOneAndDelete({
          _id: deviceId,
        });
        if (deletedDeviceId) {
          res.status(200).json(
            new ApiResponse(200, {}, "Successfully deleted device!")
          );
        }
      }
    } catch (error: any) {
      res.status(400);
      throw new Error(error?.message);
    }
  }
);

export { getDevices, addDevices, updateDevice, deleteDevice };