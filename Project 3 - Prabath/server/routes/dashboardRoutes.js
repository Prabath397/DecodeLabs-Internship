import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
const wrap=fn=>(req,res,next)=>Promise.resolve().then(()=>fn(req,res,next)).catch(next);
export const dashboardRoutes=db=>{const r=Router(),c=dashboardController(db);r.get('/stats',wrap(c.stats));r.get('/recent-movements',wrap(c.recent));return r;};
