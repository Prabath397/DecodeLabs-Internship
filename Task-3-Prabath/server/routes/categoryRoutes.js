import { Router } from 'express';
import { categoryController } from '../controllers/categoryController.js';
const wrap=fn=>(req,res,next)=>Promise.resolve().then(()=>fn(req,res,next)).catch(next);
export const categoryRoutes=db=>{const r=Router(),c=categoryController(db);r.get('/',wrap(c.list));r.get('/:id',wrap(c.get));r.post('/',wrap(c.create));r.put('/:id',wrap(c.update));r.delete('/:id',wrap(c.remove));return r;};
