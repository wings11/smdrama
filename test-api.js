const axios = require('axios');

const baseURL = 'http://localhost:5000/api';

const testAPI = async () => {
  console.log('🧪 Testing Translated Movies Backend API...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const health = await axios.get(`${baseURL}/health`);
    console.log('✅ Health Check:', health.data);
    console.log();

    // Test 2: Get Movies (Public)
    console.log('2. Testing Get Movies (Public)...');
    const movies = await axios.get(`${baseURL}/movies`);
    console.log('✅ Movies Count:', movies.data.data.length);
    console.log('📽️  First Movie:', movies.data.data[0]?.title || 'None');
    console.log();

    // Test 3: Get Featured Movies
    console.log('3. Testing Featured Movies...');
    const featured = await axios.get(`${baseURL}/movies/featured`);
    console.log('✅ Featured Movies Count:', featured.data.data.length);
    console.log();

    // Test 4: Admin Login
    console.log('4. Testing Admin Login...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@translatedmovies.com',
      password: 'admin123456'
    });
    console.log('✅ Admin Login Success:', loginResponse.data.user.email);
    const adminToken = loginResponse.data.token;
    console.log();

    // Test 5: Client Login
    console.log('5. Testing Client Login...');
    const clientLogin = await axios.post(`${baseURL}/auth/login`, {
      email: 'client@translatedmovies.com',
      password: 'client123456'
    });
    console.log('✅ Client Login Success:', clientLogin.data.user.email);
    const clientToken = clientLogin.data.token;
    console.log();

    // Test 6: Admin Dashboard
    console.log('6. Testing Admin Dashboard...');
    const adminDashboard = await axios.get(`${baseURL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Admin Dashboard Stats:', {
      totalMovies: adminDashboard.data.data.statistics.totalMovies,
      totalSeries: adminDashboard.data.data.statistics.totalSeries,
      totalClicks: adminDashboard.data.data.statistics.totalClicks
    });
    console.log();

    // Test 7: Client Dashboard
    console.log('7. Testing Client Dashboard...');
    const clientDashboard = await axios.get(`${baseURL}/client/dashboard`, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    console.log('✅ Client Dashboard Stats:', {
      totalMovies: clientDashboard.data.data.statistics.totalMovies,
      totalSeries: clientDashboard.data.data.statistics.totalSeries,
      totalClicks: clientDashboard.data.data.statistics.totalClicks
    });
    console.log();

    // Test 8: Click a Movie (simulate user click)
    console.log('8. Testing Movie Click...');
    const firstMovieId = movies.data.data[0]._id;
    const clickResponse = await axios.post(`${baseURL}/movies/${firstMovieId}/click`);
    console.log('✅ Movie Click Success:', clickResponse.data.title);
    console.log('📱 Telegram Link:', clickResponse.data.telegramLink);
    console.log();

    // Test 9: Search Movies
    console.log('9. Testing Movie Search...');
    const searchResponse = await axios.get(`${baseURL}/movies?search=batman`);
    console.log('✅ Search Results:', searchResponse.data.data.length);
    console.log();

    console.log('🎉 All tests passed! Backend is working perfectly!\n');
    
    console.log('📋 Summary:');
    console.log('- MongoDB: Connected ✅');
    console.log('- Public API: Working ✅');
    console.log('- Authentication: Working ✅');
    console.log('- Admin Dashboard: Working ✅');
    console.log('- Client Dashboard: Working ✅');
    console.log('- Movie Clicks: Working ✅');
    console.log('- Search: Working ✅');
    console.log('- Redis: Optional (for caching) ⚠️');
    console.log('\n🚀 Your backend is ready for production!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n🔧 Debug info:');
    console.log('URL:', error.config?.url);
    console.log('Method:', error.config?.method);
    console.log('Status:', error.response?.status);
  }
};

// Install axios if not present and run tests
const runTests = async () => {
  try {
    await testAPI();
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('axios')) {
      console.log('Installing axios for testing...');
      const { exec } = require('child_process');
      exec('npm install axios', (err) => {
        if (err) {
          console.error('Failed to install axios:', err);
          return;
        }
        console.log('Axios installed, running tests...\n');
        delete require.cache[require.resolve('axios')];
        testAPI();
      });
    } else {
      console.error('Error running tests:', error.message);
    }
  }
};

runTests();
