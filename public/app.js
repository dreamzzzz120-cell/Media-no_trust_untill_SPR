const form = document.getElementById('form');
const status = document.getElementById('status');
const result = document.getElementById('result');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = document.getElementById('file').files[0];
  if (!file) return;
  status.textContent = 'Verifying…';
  result.textContent = '';
  const body = new FormData();
  body.append('file', file);
  try {
    const response = await fetch('/v1/media/verify', { method: 'POST', body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Verification failed');
    status.textContent = `Verdict: ${data.verdict} — Distribution: ${data.distribution}`;
    result.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    status.textContent = 'Verification failed';
    result.textContent = String(error);
  }
});
