import { Router } from 'express';
import { getBuildingData } from '../utils';

const router = Router();

router.get('/', (req, res) => {
  res.json(getBuildingData());
});

export default router;
