import { dashboardRepository } from '../repositories/dashboardRepository.js';
import { stockRepository } from '../repositories/stockRepository.js';
export const dashboardController=db=>{const repo=dashboardRepository(db),stock=stockRepository(db);return {
  stats:(req,res)=>res.json({success:true,data:{...repo.stats(),restockProducts:repo.restock()}}),
  recent:(req,res)=>res.json({success:true,data:stock.list(null,10)})
};};
