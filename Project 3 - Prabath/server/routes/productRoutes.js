import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { stockController } from '../controllers/stockController.js';
const wrap=fn=>(req,res,next)=>Promise.resolve().then(()=>fn(req,res,next)).catch(next);
export const productRoutes=db=>{const r=Router(),c=productController(db),s=stockController(db);r.get('/',wrap(c.list));r.get('/:id/stock-movements',wrap(s.productList));r.post('/:id/stock-movements',wrap(s.create));r.get('/:id',wrap(c.get));r.post('/',wrap(c.create));r.put('/:id',wrap(c.update));r.delete('/:id',wrap(c.remove));return r;};
