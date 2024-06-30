import mongoose, { Document, ObjectId, Schema } from "mongoose";

interface reportType extends Document {
  date : { type: Date, required: true};
  numberPlateImg : { type: String, required: true};
  vehicleImg : { type: String, required: true};
  deviceName : { type: String, required: true};
  vehicleType : { type: String, required: true};
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema: Schema<reportType> = new Schema<reportType>(
  {
    date : {
      type: Date,
      required: true
    },
    numberPlateImg : {
       type: String,
      required: true
    },
    vehicleImg : { 
      type: String,
      required: true
    },
    vehicleType : { 
      type: String,
      required: true
    },
    deviceName : {
      type: String,
      required: true
    },
  },
  { timestamps: true }
);

const Report = mongoose.model<reportType>("Report", reportSchema);

export { Report };