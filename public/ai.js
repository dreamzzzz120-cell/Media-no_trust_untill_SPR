const form = document.querySelector('#lookup');
form.addEventListener('submit', async event => {
 event.preventDefault();
 const status = document.querySelector('#status');
 const detail = document.querySelector('#detail');
 const list = document.querySelector('#timeline');
 status.textContent = 'Loading…'; detail.replaceChildren(); list.replaceChildren();
 const id = encodeURIComponent(document.querySelector('#ai').value.trim());
 const headers = { 'x-api-key': document.querySelector('#key').value };
 try {
  const [systemResponse, historyResponse] = await Promise.all([fetch(`/v1/ai/${id}`, { headers, cache: 'no-store' }), fetch(`/v1/ai/${id}/timeline`, { headers, cache: 'no-store' })]);
  if (!systemResponse.ok || !historyResponse.ok) throw new Error(`Request failed (${systemResponse.status}/${historyResponse.status})`);
  const system = await systemResponse.json(); const history = await historyResponse.json();
  const heading = document.createElement('h2'); heading.textContent = system.name; detail.append(heading);
  const coverage = document.createElement('p'); coverage.textContent = `Coverage: ${history.coverage}. Monitoring: ${system.monitoringStatus}. Compliance: ${system.compliance.state} — ${system.compliance.reason}`; detail.append(coverage);
  for (const item of history.events) { const row = document.createElement('li'); row.textContent = item.statement; list.append(row); }
  status.textContent = `${history.events.length} recorded events. Evidence hashes are references supplied by the source, not independently verified files.`;
 } catch (error) { status.textContent = error.message; }
});
