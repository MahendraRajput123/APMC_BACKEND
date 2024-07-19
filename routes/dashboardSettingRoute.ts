import express from 'express';
import { getDashboardSettings, upsertDashboardSettings, deleteDashboardSettings } from '../controller/dashboardSettingController';

const router = express.Router();

router.route("/get").get(getDashboardSettings);
router.route("/add-update").post(upsertDashboardSettings);
router.route('/delete').delete(deleteDashboardSettings);

module.exports = router;