import express, { NextFunction, Request, Response } from "express";
import {
  addConnection,
  getConnections,
  updateConnection,
  deleteConnection
} from "../controller/connectionController";
import { checkVersion } from "../middleware/check-version";

interface ReqWithVersion extends Request {
  apiVersion?: string;
}

const router = express.Router();

// all connection routes
router.route("/get-all").get(getConnections);
router.route("/add").post(addConnection);
router.route("/update/:id").put(updateConnection);
router.route("/delete/:id").delete(deleteConnection);

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