const input = document.getElementById('scan-input');
const form = document.getElementById('scan-form');
const label = document.getElementById('input-label');
const hint = document.getElementById('input-hint');
const charCount = document.getElementById('char-count');
const result = document.getElementById('result');
const tabs = [...document.querySelectorAll('.tab')];
let mode = 'url';

const examples = {
  url: 'http://secure-bank-example.invalid/verify-account?urgent=1',
  message: 'URGENT! Your bank account will be blocked today. Click this link now and reply with your OTP to verify your account.'
};

function setMode(nextMode) {
  mode = nextMode;
  tabs.forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  label.textContent = mode === 'url' ? 'Paste a URL to review' : 'Paste a suspicious message to review';
  input.placeholder = mode === 'url' ? 'Example: http://example.com/login' : 'Paste the message text here…';
  hint.textContent = mode === 'url' ? 'Check links you did not expect to receive.' : 'Do not include real passwords, PINs, or OTPs.';
  input.value = '';
  charCount.textContent = '0 / 3000';
  result.classList.add('hidden');
}
tabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
input.addEventListener('input', () => charCount.textContent = `${input.value.length} / 3000`);
document.querySelectorAll('.example-btn').forEach(btn => btn.addEventListener('click', () => {
  setMode(btn.dataset.example);
  input.value = examples[mode];
  charCount.textContent = `${input.value.length} / 3000`;
  input.focus();
}));
document.getElementById('clear-btn').addEventListener('click', () => {
  input.value = '';
  charCount.textContent = '0 / 3000';
  result.classList.add('hidden');
  input.focus();
});

function analyseUrl(value) {
  const signals = [];
  let parsed;
  try { parsed = new URL(value.trim()); }
  catch { return {score: 2, signals: ['This text is not a complete, valid URL. Check the address carefully before opening it.']}; }
  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== 'https:') signals.push('The link does not use HTTPS encryption.');
  if (parsed.username || parsed.password) signals.push('The address contains a username/password section, which can be a deceptive URL pattern.');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) signals.push('The address uses an IP address instead of a familiar domain name.');
  if (host.includes('xn--')) signals.push('The domain contains encoded characters; check carefully for look-alike characters.');
  if (host.split('.').length >= 5) signals.push('The domain has many subdomain levels. Make sure the main domain is correct.');
  if (/@/.test(value)) signals.push('The URL contains an @ symbol, which can make the actual destination confusing.');
  if (/(login|verify|account|secure|update|wallet|claim|gift|bank|otp|password)/i.test(value)) signals.push('The URL includes words often seen in account-verification or reward lures. These words alone do not prove fraud.');
  if (/[^\x00-\x7F]/.test(host)) signals.push('The domain contains non-ASCII characters; check for possible look-alike characters.');
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') signals.push('The link uses an unusual protocol.');
  if (signals.length === 0) signals.push('No obvious warning pattern was detected by these basic checks. This does not mean the link is safe.');
  return {score: signals.length, signals};
}
function analyseMessage(value) {
  const signals = [];
  if (/\b(urgent|immediately|last chance|act now|blocked today|expires today|within \d+ hours?)\b/i.test(value)) signals.push('Uses urgency or pressure to push a quick decision.');
  if (/\b(otp|one[- ]time password|pin|password|cvv|card number|bank details)\b/i.test(value)) signals.push('Mentions sensitive credentials or payment details. Never share these in a message.');
  if (/\b(click|tap|open|visit)\b/i.test(value) && /https?:\/\/|www\./i.test(value)) signals.push('Encourages opening a link. Verify the destination independently.');
  if (/\b(prize|winner|free gift|claim|reward|cashback|lottery)\b/i.test(value)) signals.push('Mentions a prize or reward that may be used as a lure.');
  if (/\b(pay now|transfer|send money|fee|payment required)\b/i.test(value)) signals.push('Requests payment or money transfer. Confirm through an official channel.');
  if (/\b(verify your account|account will be blocked|suspended account)\b/i.test(value)) signals.push('Uses account verification or suspension language that can be used in impersonation scams.');
  if (signals.length === 0) signals.push('No common warning phrase was detected. Scams can use ordinary wording, so verify the sender and context.');
  return {score: signals.length, signals};
}
function renderResult(data) {
  const level = data.score >= 3 ? 'HIGH' : data.score >= 1 ? 'MEDIUM' : 'LOW';
  const cls = level === 'HIGH' ? 'risk-high' : level === 'MEDIUM' ? 'risk-medium' : 'risk-low';
  const title = level === 'HIGH' ? 'Be very cautious' : level === 'MEDIUM' ? 'Review before acting' : 'Few obvious signals found';
  result.innerHTML = `
    <div class="result-head">
      <div><h3>${title}</h3><p class="summary">This demo found ${data.score} warning signal${data.score === 1 ? '' : 's'} to review.</p></div>
      <span class="risk-pill ${cls}">${level} ATTENTION</span>
    </div>
    <ul class="signals">${data.signals.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
    <div class="result-foot">Next step: do not use the link in the message. Open the organisation's official app or type its known website yourself. Never share an OTP or password.</div>`;
  result.classList.remove('hidden');
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
form.addEventListener('submit', event => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  const data = mode === 'url' ? analyseUrl(value) : analyseMessage(value);
  renderResult(data);
});
