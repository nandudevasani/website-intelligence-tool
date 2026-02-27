import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cheerio from 'cheerio';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const POLITICAL_DOMAINS = ['vote4turner.com'];

async function analyzeDomain(domain) {
  let result = { domain, status: 'Valid', remark: '', notes: '' };

  try {
    const response = await axios.get('https://' + domain, { maxRedirects: 5, validateStatus: null });

    // Detect redirects
    if (response.request.res.responseUrl && !response.request.res.responseUrl.includes(domain)) {
      result.status = 'Invalid';
      result.remark = 'Redirected';
      result.notes = 'Redirect → ' + new URL(response.request.res.responseUrl).hostname;
      return result;
    }

    // Word count
    const $ = cheerio.load(response.data);
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = text.split(' ').filter(w => w.length > 0).length;

    result.notes = `WC: ${wordCount}, SSL: ✅, HTTP: ${response.status}`;

    if (wordCount < 20) result.remark = 'No Content';
    if (POLITICAL_DOMAINS.includes(domain)) result.remark = 'Political Campaign Site';

  } catch (err) {
    result.status = 'Invalid';
    result.remark = 'Website not reachable';
  }

  return result;
}

// Bulk endpoint
app.post('/api/analyze-bulk', async (req, res) => {
  const domains = req.body.domains || [];
  const results = [];
  for (let domain of domains) {
    domain = domain.trim();
    if (!domain) continue;
    const analysis = await analyzeDomain(domain);
    results.push(analysis);
  }
  res.json(results);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
