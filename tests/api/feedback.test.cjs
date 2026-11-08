const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');

const env = { ...process.env };
afterEach(() => { mock.restoreAll(); process.env = { ...env }; });

function setup() {
  process.env.GMAIL_ADDRESS = 'sender@gmail.com';
  process.env.GMAIL_APP_PASSWORD = 'test-app-password';
  process.env.FEEDBACK_TO = 'recipient@gmail.com';
  const sendMail = mock.fn(async () => ({ accepted: ['recipient@gmail.com'] }));
  const create = mock.method(nodemailer, 'createTransport', () => ({ sendMail }));
  delete require.cache[require.resolve('../../api/feedback')];
  const handler = require('../../api/feedback');
  return { handler, sendMail, create };
}

function response() {
  return { headers: {}, statusCode: 200, setHeader(k,v) { this.headers[k] = v; }, status(s) { this.statusCode = s; return this; }, json(body) { this.body = body; return this; } };
}
function request(overrides = {}) {
  return { method: 'POST', headers: { origin: 'https://jspuzzle-lb.vercel.app', 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1' }, body: { message: 'Please add a date filter.' }, ...overrides };
}

test('awaits SMTP acceptance and never accepts sender/recipient fields from the browser', async () => {
  const {handler,sendMail,create} = setup();
  let resolve;
  sendMail.mock.mockImplementation(() => new Promise(r => { resolve=r; }));
  const res=response();
  const pending=handler(request({body:{message:'  Hello\nworld  ',to:'attacker@example.com',subject:'Injected'}}),res);
  await Promise.resolve();
  assert.equal(res.body,undefined);
  resolve({accepted:['recipient@gmail.com']});
  await pending;
  assert.equal(res.statusCode,200);
  assert.deepEqual(res.body,{ok:true});
  const mail=sendMail.mock.calls[0].arguments[0];
  assert.equal(mail.to,'recipient@gmail.com');
  assert.equal(mail.subject,'[JS Puzzle] Website feedback');
  assert.ok(mail.text.startsWith('Hello\nworld\n'));
  assert.equal(create.mock.calls[0].arguments[0].secure,true);
});

test('rejects invalid methods, origins, content types, and bodies without connecting to SMTP', async () => {
  const {handler,create}=setup();
  const cases=[
    [request({method:'GET'}),405],
    [request({headers:{origin:'https://attacker.example','content-type':'application/json'}}),403],
    [request({headers:{origin:'https://jspuzzle-lb.vercel.app','content-type':'text/plain'}}),415],
    [request({headers:{origin:'https://jspuzzle-lb.vercel.app','content-type':'application/json','content-length':'12001'}}),413],
    [request({body:'{broken'}),400],
    [request({body:[]}),400],
    [request({body:{message:'   '}}),400],
    [request({body:{message:'a'.repeat(2001)}}),400],
  ];
  for (const [req,code] of cases) { const res=response(); await handler(req,res); assert.equal(res.statusCode,code); }
  assert.equal(create.mock.callCount(),0);
});

test('honeypot submissions never trigger mail', async () => {
  const {handler,create}=setup();
  const res=response();
  await handler(request({body:{message:'Spam',website:'https://spam.example'}}),res);
  assert.equal(res.statusCode,200);
  assert.equal(create.mock.callCount(),0);
});

test('missing credentials fail honestly', async () => {
  const {handler,create}=setup();
  delete process.env.GMAIL_APP_PASSWORD;
  mock.method(console,'error',()=>{});
  const res=response();
  await handler(request(),res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.ok,undefined);
  assert.equal(create.mock.callCount(),0);
});

test('requires a server-configured recipient without a fallback address', async () => {
  const {handler,create}=setup();
  delete process.env.FEEDBACK_TO;
  mock.method(console,'error',()=>{});
  const res=response();
  await handler(request(),res);
  assert.equal(res.statusCode,503);
  assert.equal(create.mock.callCount(),0);
});

test('rejected mail reports failure and does not disclose SMTP errors', async () => {
  const {handler,sendMail}=setup();
  sendMail.mock.mockImplementation(async()=>{throw Object.assign(new Error('Sensitive SMTP detail'),{code:'EAUTH'});});
  mock.method(console,'error',()=>{});
  const res=response();
  await handler(request(),res);
  assert.equal(res.statusCode,502);
  assert.ok(!JSON.stringify(res.body).includes('Sensitive'));
});

test('throttles repeated submissions in an instance and supplies Retry-After', async () => {
  const {handler,sendMail}=setup();
  for(let i=0;i<3;i++){const res=response();await handler(request(),res);assert.equal(res.statusCode,200);}
  const blocked=response();
  await handler(request(),blocked);
  assert.equal(blocked.statusCode,429);
  assert.ok(Number(blocked.headers['Retry-After'])>0);
  assert.equal(sendMail.mock.callCount(),3);
});
