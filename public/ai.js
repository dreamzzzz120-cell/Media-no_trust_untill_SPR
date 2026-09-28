const $ = selector => document.querySelector(selector);
let nextCursor = null; let historyExpanded = false;
function renderEvents(events) { for (const item of events) { const li = document.createElement('li'); li.textContent = `${item.statement} State: ${item.state}. Event: ${item.id}${item.relatedEventId ? `. Related claim: ${item.relatedEventId}` : ''}`; $('#timeline').append(li); } }
const key = () => $('#key').value;
const id = () => $('#ai').value.trim();
const status = message => { $('#status').textContent = message; };
async function api(path, options = {}) {
 const response = await fetch(path, { ...options, cache: 'no-store', headers: { 'x-api-key': key(), 'content-type': 'application/json', ...options.headers } });
 const body = await response.json();
 if (!response.ok) throw new Error(`${body.error || 'Request failed'} (${response.status})`);
 return body;
}
async function refresh() {
 const path = `/v1/ai/${encodeURIComponent(id())}`;
 const [system, history, alerts, coverage, integrity] = await Promise.all([api(path), api(`${path}/timeline`), api(`${path}/alerts`), api(`${path}/coverage`), api(`${path}/integrity`)]);
 $('#detail').replaceChildren(); $('#timeline').replaceChildren(); $('#alerts').replaceChildren(); $('#coverage').replaceChildren(); $('#integrity').replaceChildren();
 const chain = document.createElement('p'); chain.textContent = `${integrity.state}: ${integrity.checkedEvents} events checked. External anchor: ${integrity.externalAnchor}.${integrity.failures.length ? ` Failed events: ${integrity.failures.join(', ')}` : ''}`; $('#integrity').append(chain);
 const heading = document.createElement('h3'); heading.textContent = `${system.name} — ${system.id}`; $('#detail').append(heading);
 const note = document.createElement('p'); note.textContent = `Purpose: ${system.purpose}. Monitoring: ${system.monitoringStatus}. Compliance: ${system.compliance.state} — ${system.compliance.reason}`; $('#detail').append(note);
 for (const source of coverage.sources) { const li = document.createElement('li'); li.className = 'coverage'; li.textContent = `${source.name}: ${source.state}${source.reason ? ` — ${source.reason}` : ''}`; $('#coverage').append(li); }
 for (const alert of alerts.alerts) { const row = document.createElement('article'); row.className = 'critical'; row.textContent = `${alert.severity} · ${alert.createdAt} · ${alert.summary} · Claim ${alert.claimEventId} → result ${alert.resultEventId}`; $('#alerts').append(row); }
 renderEvents(history.events); nextCursor = history.nextCursor; $('#more').hidden = !history.hasMore; historyExpanded = false;
 $('#activity').hidden = false;
 status(`${history.events.length} recorded events, ${alerts.alerts.length} critical contradictions. Coverage is limited to the connected sources shown above.`);
}
$('#more').addEventListener('click', async () => { if (nextCursor === null) return; try { const page = await api(`/v1/ai/${encodeURIComponent(id())}/timeline?afterSequence=${nextCursor}`); renderEvents(page.events); nextCursor = page.nextCursor; $('#more').hidden = !page.hasMore; historyExpanded = true; status(`${$('#timeline').children.length} events loaded in ingestion order${page.hasMore ? '; more history available' : ''}.`); } catch (error) { status(error.message); } });
$('#lookup').addEventListener('submit', async event => { event.preventDefault(); try { await refresh(); } catch (error) { status(error.message); } });
$('#register').addEventListener('submit', async event => {
 event.preventDefault();
 try { const values = Object.fromEntries(new FormData(event.currentTarget)); const system = await api('/v1/ai', { method: 'POST', body: JSON.stringify(values) }); $('#ai').value = system.id; await refresh(); } catch (error) { status(error.message); }
});
$('#report').addEventListener('submit', async event => {
 event.preventDefault();
 try {
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const bytes = new TextEncoder().encode(values.summary);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const evidenceHash = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  await api(`/v1/ai/${encodeURIComponent(id())}/events`, { method: 'POST', body: JSON.stringify({ ...values, sourceType: 'DECLARATION', occurredAt: new Date().toISOString(), evidenceHash }) });
  event.currentTarget.reset(); await refresh();
 } catch (error) { status(error.message); }
});

setInterval(() => { if (id() && key() && !document.hidden && !historyExpanded && nextCursor === null) refresh().catch(error => status(error.message)); }, 5000);
