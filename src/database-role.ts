export function databaseUrlForRole(databaseUrl:string,role:'constellation_api_runtime'|'constellation_worker_runtime'){
  const u=new URL(databaseUrl);
  const existing=u.searchParams.get('options')?.trim();
  const roleOption='-c role='+role;
  u.searchParams.set('options',existing?existing+' '+roleOption:roleOption);
  return u.toString();
}
