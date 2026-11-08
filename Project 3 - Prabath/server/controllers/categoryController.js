import { categoryRepository } from '../repositories/categoryRepository.js';
import { validate, idParam } from '../middleware/validation.js';
import { notFound } from '../utils/errors.js';
const schema={name:{type:'string',min:1,max:100,required:true},description:{type:'string',max:500}};
export const categoryController=db=>{const repo=categoryRepository(db);return {
  list:(req,res)=>res.json({success:true,data:repo.all()}),
  get:(req,res)=>{const x=repo.byId(idParam(req.params.id));if(!x)throw notFound('Category');res.json({success:true,data:x});},
  create:(req,res)=>res.status(201).json({success:true,data:repo.create(validate(req.body,schema))}),
  update:(req,res)=>{const id=idParam(req.params.id);const x=repo.update(id,validate(req.body,schema));if(!x)throw notFound('Category');res.json({success:true,data:x});},
  remove:(req,res)=>{if(!repo.remove(idParam(req.params.id)))throw notFound('Category');res.status(204).end();}
};};
