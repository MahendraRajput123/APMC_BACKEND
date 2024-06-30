import express, { NextFunction, Request, Response } from "express";
import {
  addDevices,
  deleteDevice,
  getDevices,
  updateDevice
} from "../controller/deviceController";
import { checkVersion } from "../middleware/check-version";

interface ReqWithVersion extends Request {
  apiVersion?: string;
}

const router = express.Router();

// all remedyType routes
router.route("/get-all").get(getDevices);
router.route("/add").post(addDevices);
router.route("/update/:id").put(updateDevice);
router.route("/delete/:id").delete(deleteDevice);

// If there are multiple versions of the API, you can use the following code
// router.use(checkVersion);
// router
//   .route("/get-all")
//   .get((req: ReqWithVersion, res: Response, next: NextFunction) => {
//     switch (req.apiVersion) {
//       case "100":
//         getDevices(req, res, next);
//         break;
//       default:
//         res.status(400).json({ error: "Invalid API version" });
//     }
// });

module.exports = router;