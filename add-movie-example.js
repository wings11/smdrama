const axios = require('axios');

// First login to get admin token
const loginAndAddMovie = async () => {
  try {
    console.log('🔑 Logging in as admin...');
    
    // Login as admin
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@translatedmovies.com',
      password: 'admin123456'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('✅ Admin login successful!');

    // Add a new movie
    console.log('🎬 Adding new movie...');
    
    const newMovie = {
      title: 'Spider-Man: No Way Home',
      originalTitle: 'Spider-Man: No Way Home',
      type: 'movie',
      year: 2021,
      genre: ['Action', 'Adventure', 'Sci-Fi'],
      language: 'English',
      description: 'Peter Parker seeks help from Doctor Strange when his secret identity is revealed.',
      telegramLink: 'https://t.me/yourtelegramchannel/newmovie001',
      rating: 8.4,
      duration: '2h 28m',
      tags: ['spider-man', 'marvel', 'superhero', 'multiverse'],
      isFeatured: true
    };

    const movieResponse = await axios.post(
      'http://localhost:5000/api/admin/movies',
      newMovie,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Movie added successfully!');
    console.log('📝 Movie Details:', {
      id: movieResponse.data.data._id,
      title: movieResponse.data.data.title,
      slug: movieResponse.data.data.slug
    });

    // Add a new series
    console.log('📺 Adding new series...');
    
    const newSeries = {
      title: 'Wednesday',
      originalTitle: 'Wednesday',
      type: 'series',
      year: 2022,
      genre: ['Comedy', 'Crime', 'Horror'],
      language: 'English',
      description: 'Wednesday Addams investigates supernatural mysteries at Nevermore Academy.',
      telegramLink: 'https://t.me/yourtelegramchannel/newseries001',
      rating: 8.1,
      seasons: 1,
      episodes: 8,
      tags: ['wednesday addams', 'supernatural', 'mystery', 'netflix'],
      isFeatured: true
    };

    const seriesResponse = await axios.post(
      'http://localhost:5000/api/admin/movies',
      newSeries,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Series added successfully!');
    console.log('📝 Series Details:', {
      id: seriesResponse.data.data._id,
      title: seriesResponse.data.data.title,
      slug: seriesResponse.data.data.slug
    });

    // Verify by getting all movies
    console.log('📋 Getting updated movie list...');
    const moviesResponse = await axios.get('http://localhost:5000/api/movies');
    console.log(`✅ Total movies/series: ${moviesResponse.data.data.length}`);
    
    console.log('\n🎉 Successfully added new content! Check your website at http://localhost:3000');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

// Run the script
loginAndAddMovie();
