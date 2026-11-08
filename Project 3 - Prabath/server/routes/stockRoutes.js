import { Router } from 'express';
import { stockController } from '../controllers/stockController.js';
const wrap=fn=>(req,res,next)=>Promise.resolve().then(()=>fn(req,res,next)).catch(next);
export const stockRoutes=db=>{const r=Router(),c=stockController(db);r.get('/',wrap(c.list));return r;};
