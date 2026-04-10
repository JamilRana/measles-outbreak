
import axios from 'axios';

async function testRoutes() {
  const routes = [
    'http://localhost:3000/api/reports/geo',
    'http://localhost:3000/api/reports/timeseries',
    'http://localhost:3000/api/admin/user-stats'
  ];

  for (const route of routes) {
    try {
      const res = await axios.get(route);
      console.log(`${route}: ${res.status}`);
    } catch (err: any) {
      console.log(`${route}: ${err.response?.status || err.message}`);
    }
  }
}

testRoutes();
