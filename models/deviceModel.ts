import mongoose, { Document, ObjectId, Schema } from "mongoose";

interface deviceType extends Document {
  name : { type: string, required: true, unique: true};
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema: Schema<deviceType> = new Schema<deviceType>(
  {
    name: {
      type: String,
      required: [true, "Please add device name"],
    },
  },
  { timestamps: true }
);

const Device = mongoose.model<deviceType>("Device", deviceSchema);

export { Device };