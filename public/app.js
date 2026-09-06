const form = document.getElementById('form');
const status = document.getElementById('status');
const result = document.getElementById('result');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = document.getElementById('file').files[0];
  const key = document.getElementById('key').value;
  const ai = document.getElementById('ai').value;
  if (!file || !key) return;
  status.textContent = 'Scanning and building evidence…';
  result.textContent = '';
  const body = new FormData();
  body.append('file', file);
  try {
    const response = await fetch('/v1/media/verify', { method: 'POST', headers: { 'x-api-key': key, 'x-declared-ai-use': ai }, body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Verification failed');
    status.textContent = `Decision: ${data.decision} · Trust: ${data.trustScore ?? 'N/A'} · Confidence: ${Math.round((data.confidence ?? 0) * 100)}%`;
    result.textContent = JSON.stringify({ passportId: data.passportId, decision: data.decision, trustScore: data.trustScore, confidence: data.confidence, aiStatus: data.aiStatus, provenance: data.provenance, trustVector: data.trustVector, evidence: data.observations, limitations: data.limitations }, null, 2);
  } catch (error) {
    status.textContent = 'Verification failed';
    result.textContent = error instanceof Error ? error.message : String(error);
  }
});
