async function request(path,options={}) {
  const response=await fetch(`/api${path}`,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  if(response.status===204)return null;
  let payload;try{payload=await response.json();}catch{throw new Error('The server returned an invalid response');}
  if(!response.ok){
    const details=payload.error?.details?.map(detail=>`${detail.field}: ${detail.message}`).join('; ');
    throw new Error(details||payload.error?.message||'Request failed');
  }
  return payload;
}
export const api={
  dashboard:()=>Promise.all([request('/dashboard/stats'),request('/dashboard/recent-movements')]),
  products:(params={})=>request(`/products?${new URLSearchParams(params)}`),product:id=>request(`/products/${id}`),createProduct:v=>request('/products',{method:'POST',body:JSON.stringify(v)}),updateProduct:(id,v)=>request(`/products/${id}`,{method:'PUT',body:JSON.stringify(v)}),deleteProduct:id=>request(`/products/${id}`,{method:'DELETE'}),
  categories:()=>request('/categories'),category:id=>request(`/categories/${id}`),createCategory:v=>request('/categories',{method:'POST',body:JSON.stringify(v)}),updateCategory:(id,v)=>request(`/categories/${id}`,{method:'PUT',body:JSON.stringify(v)}),deleteCategory:id=>request(`/categories/${id}`,{method:'DELETE'}),
  suppliers:(search='')=>request(`/suppliers?${new URLSearchParams({search})}`),supplier:id=>request(`/suppliers/${id}`),createSupplier:v=>request('/suppliers',{method:'POST',body:JSON.stringify(v)}),updateSupplier:(id,v)=>request(`/suppliers/${id}`,{method:'PUT',body:JSON.stringify(v)}),deleteSupplier:id=>request(`/suppliers/${id}`,{method:'DELETE'}),
  movements:()=>request('/stock-movements'),productMovements:id=>request(`/products/${id}/stock-movements`),move:(id,v)=>request(`/products/${id}/stock-movements`,{method:'POST',body:JSON.stringify(v)})
};
