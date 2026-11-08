import { supplierRepository } from '../repositories/supplierRepository.js';
import { validate,idParam } from '../middleware/validation.js';
import { notFound } from '../utils/errors.js';
const schema={name:{type:'string',min:1,max:120,required:true},contactPerson:{type:'string',max:120},email:{type:'string',max:254,email:true},phone:{type:'string',max:40},address:{type:'string',max:500}};
export const supplierController=db=>{const repo=supplierRepository(db);return {
  list:(req,res)=>res.json({success:true,data:repo.all(String(req.query.search||'').slice(0,120))}),
  get:(req,res)=>{const x=repo.byId(idParam(req.params.id));if(!x)throw notFound('Supplier');res.json({success:true,data:x});},
  create:(req,res)=>res.status(201).json({success:true,data:repo.create(validate(req.body,schema))}),
  update:(req,res)=>{const id=idParam(req.params.id),x=repo.update(id,validate(req.body,schema));if(!x)throw notFound('Supplier');res.json({success:true,data:x});},
  remove:(req,res)=>{if(!repo.remove(idParam(req.params.id)))throw notFound('Supplier');res.status(204).end();}
};};
