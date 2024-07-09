import express, { NextFunction, Request, Response } from "express";
import {
  getReport,
  addReport,
  updateReport,
  deleteReport,
  generatePDFReport,
} from "../controller/reportController";
import { checkVersion } from "../middleware/check-version";

interface ReqWithVersion extends Request {
  apiVersion?: string;
}

const router = express.Router();

// all report routes
router.route("/get-all").get(getReport);
router.route("/add").post(addReport);
router.route("/update/:id").put(updateReport);
router.route("/delete/:id").delete(deleteReport);
router.route("/generate-pdf").get(generatePDFReport);

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