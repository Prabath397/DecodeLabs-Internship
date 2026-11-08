import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryRoutes } from './routes/categoryRoutes.js';
import { supplierRoutes } from './routes/supplierRoutes.js';
import { productRoutes } from './routes/productRoutes.js';
import { stockRoutes } from './routes/stockRoutes.js';
import { dashboardRoutes } from './routes/dashboardRoutes.js';
import { errorHandler,notFoundHandler } from './middleware/errorHandler.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function createApp(db) {
  const app=express();
  app.disable('x-powered-by');
  app.use(express.json({limit:'100kb'}));
  app.get('/api/health',(req,res)=>{db.prepare('SELECT 1 AS ready').get();res.json({success:true,data:{status:'ok',database:'connected'}});});
  app.use('/api/categories',categoryRoutes(db));
  app.use('/api/suppliers',supplierRoutes(db));
  app.use('/api/products',productRoutes(db));
  app.use('/api/stock-movements',stockRoutes(db));
  app.use('/api/dashboard',dashboardRoutes(db));
  app.use('/api',notFoundHandler);
  app.use(express.static(root,{extensions:['html']}));
  app.get('*splat',(req,res)=>res.sendFile(path.join(root,'index.html')));
  app.use(errorHandler);
  return app;
}
