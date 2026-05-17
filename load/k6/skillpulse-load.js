import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    ui_like: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 10 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const API = `${BASE_URL}/api`;

export default function () {
  const dashRes = http.get(`${API}/dashboard`, { headers: { Accept: 'application/json' } });
  check(dashRes, {
    'dashboard is 200': (r) => r.status === 200,
    'dashboard is json': (r) => (r.headers['Content-Type'] || '').includes('application/json'),
  });

  const skillsRes = http.get(`${API}/skills`, { headers: { Accept: 'application/json' } });
  check(skillsRes, {
    'skills is 200': (r) => r.status === 200,
  });

  // Note: POST endpoints will create data; keep them out of default load.
  // If you want write-load, enable the block below and ensure your backend allows it.
  //
  // sleep(0.2);
  // const payload = JSON.stringify({ name: 'k6-skill', category: 'Other', target_hours: 1 });
  // const createRes = http.post(`${API}/skills`, payload, { headers: { 'Content-Type': 'application/json' } });
  // check(createRes, { 'create skill is 201': (r) => r.status === 201 });

  sleep(0.5);
}

