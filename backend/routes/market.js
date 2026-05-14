const express = require('express');
const router = express.Router();

const AO_DATA_API = 'https://www.albion-online-data.com/api/v2/stats/prices';
const LOCATIONS   = 'Caerleon,Bridgewatch,Fort Sterling,Martlock,Thetford,Lymhurst';

// Short cache: 5 min per item set
const priceCache = new Map();
const PRICE_TTL = 5 * 60 * 1000;

// GET /api/market/price?items=T8_MAIN_SWORD,T8_HEAD_PLATE_SET1@2
router.get('/price', async (req, res) => {
  const { items } = req.query;
  if (!items) return res.json([]);

  const cacheKey = items;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < PRICE_TTL) return res.json(cached.data);

  try {
    const url = `${AO_DATA_API}/${encodeURIComponent(items)}?locations=${encodeURIComponent(LOCATIONS)}&qualities=1`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Market API no disponible');
    const data = await response.json();

    // Aggregate: pick the cheapest non-zero sell price across all cities per item
    const byItem = {};
    for (const entry of data) {
      const id = entry.item_id;
      const price = entry.sell_price_min;
      if (!price || price === 0) continue;
      if (!byItem[id] || price < byItem[id].price) {
        byItem[id] = { price, city: entry.city };
      }
    }

    const result = Object.entries(byItem).map(([id, { price, city }]) => ({ id, price, city }));
    priceCache.set(cacheKey, { data: result, ts: Date.now() });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
