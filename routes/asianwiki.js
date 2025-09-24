const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const router = express.Router();
// Simple in-memory cache for scraped pages (TTL 10 minutes)
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Helper: normalize AsianWiki URLs
function normalizeUrl(raw) {
  if (!raw) return null;
  // If just a path like /My_Youth, prefix domain
  if (raw.startsWith('/')) return `https://asianwiki.com${raw}`;
  if (!raw.startsWith('http')) return `https://asianwiki.com/${raw}`;
  return raw;
}

// Scrape an AsianWiki page and return structured JSON
async function scrapeAsianWiki(url) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0; +https://example.com/bot)'
    },
    timeout: 10000
  });

  const $ = cheerio.load(res.data);

  // Title
  const title = $('h1').first().text().trim() || $('title').first().text().trim();

  // Poster - many AsianWiki pages use .thumbimage inside #mw-content-text or .infobox
  let poster = null;
  const thumb = $('.thumbimage').first();
  if (thumb && thumb.attr('src')) {
    poster = thumb.attr('src');
    if (poster && poster.startsWith('//')) poster = 'https:' + poster;
  }
  // Try infobox images
  if (!poster) {
    const infoboxImg = $('.infobox img').first();
    if (infoboxImg && infoboxImg.attr('src')) {
      poster = infoboxImg.attr('src');
      if (poster && poster.startsWith('//')) poster = 'https:' + poster;
    }
  }

  // Synopsis / summary - look for a paragraph under a header like 'Synopsis' or the first paragraph
  let synopsis = null;
  const synopsisHeader = $("h2:contains('Synopsis'), h3:contains('Synopsis'), h2:contains('Plot'), h3:contains('Plot')").first();
  if (synopsisHeader && synopsisHeader.length) {
    // next paragraphs until next heading
    let p = synopsisHeader.nextAll('p').first();
    if (p && p.length) synopsis = p.text().trim();
  }
  if (!synopsis) {
    // fallback to first paragraph in content
    const firstP = $('#mw-content-text p').first();
    if (firstP && firstP.length) synopsis = firstP.text().trim();
  }

  // Cast - look for a 'Cast' section or lists within infobox
  let cast = [];
  const castHeader = $("h2:contains('Cast'), h3:contains('Cast'), h2:contains('Starring')").first();
  if (castHeader && castHeader.length) {
    castHeader.nextAll('ul').first().find('li').each((i, el) => {
      const text = $(el).text().trim();
      if (text) cast.push(text.replace(/\s+/g, ' '));
    });
  }
  // Try infobox fields like 'Starring'
  if (!cast.length) {
    $('.infobox tr').each((i, el) => {
      const th = $(el).find('th').text().trim();
      if (/Starring|Cast/i.test(th)) {
        $(el).find('td').text().split(/\n|,/).forEach(item => {
          const v = item.trim();
          if (v) cast.push(v);
        });
      }
    });
  }

  // Additional metadata: release year, episodes, rating if available
  let year = null;
  const yearMatch = title && title.match(/\((\d{4})\)/);
  if (yearMatch) year = yearMatch[1];

  // Build JSON
  return {
    source: 'asianwiki',
    url,
    title: title || null,
    poster: poster || null,
    synopsis: synopsis || null,
    cast: cast,
    year: year
  };
}

// Route: GET /api/asianwiki?url={fullUrl}
router.get('/', async (req, res) => {
  try {
    const raw = req.query.url || req.query.u || req.query.path;
    if (!raw) return res.status(400).json({ error: 'Missing url parameter' });

    const url = normalizeUrl(raw);
    if (!url) return res.status(400).json({ error: 'Invalid url parameter' });

    // Only allow asianwiki domain for safety
    try {
      const parsed = new URL(url);
      if (!/asianwiki\.com$/i.test(parsed.hostname) && !/asianwiki\.com/i.test(parsed.hostname)) {
        return res.status(400).json({ error: 'Only asianwiki.com URLs are allowed' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Malformed URL' });
    }

    const cached = cache.get(url);
    if (cached) return res.json(cached);

    const data = await scrapeAsianWiki(url);
    cache.set(url, data);
    return res.json(data);
  } catch (error) {
    console.error('asianwiki scrape error', error && error.message);
    return res.status(500).json({ error: 'Failed to fetch or parse the AsianWiki page' });
  }
});

module.exports = router;
