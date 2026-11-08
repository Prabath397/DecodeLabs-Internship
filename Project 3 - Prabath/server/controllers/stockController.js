import { stockRepository } from '../repositories/stockRepository.js';
import { inventoryService } from '../services/inventoryService.js';
import { validate,idParam } from '../middleware/validation.js';
import { productRepository } from '../repositories/productRepository.js';
import { notFound } from '../utils/errors.js';
const schema={type:{type:'string',values:['IN','OUT'],required:true},quantity:{type:'integer',min:1,required:true},note:{type:'string',max:500}};
export const stockController=db=>{const repo=stockRepository(db),service=inventoryService(db),products=productRepository(db);return {
  list:(req,res)=>res.json({success:true,data:repo.list(null,100)}),
  productList:(req,res)=>{const id=idParam(req.params.id);if(!products.byId(id))throw notFound('Product');res.json({success:true,data:repo.list(id,100)});},
  create:(req,res)=>res.status(201).json({success:true,data:service.recordMovement(idParam(req.params.id),validate(req.body,schema))})
};};
