// get-market-news: busca RSS InfoMoney mercados e popula cache em market_news_cache.
// Idempotente — usa unique index em link + Prefer: resolution=ignore-duplicates.
// Disparado por cron a cada hora cheia.

const RSS_URLS = [
  'https://www.infomoney.com.br/mercados/feed/',
  'https://www.infomoney.com.br/feed/',
];
const MAX_NEWS = 20;

interface NewsItem {
  titulo: string;
  descricao: string;
  link: string;
  publicado_em: string;
}

function extractTag(content: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const match = content.match(regex);
  return match ? match[1] : '';
}

function stripHTML(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < MAX_NEWS) {
    const content = match[1];
    const titulo = stripHTML(extractTag(content, 'title'));
    const link = extractTag(content, 'link');
    const descricao = stripHTML(extractTag(content, 'description'));
    const pubDate = extractTag(content, 'pubDate');
    if (titulo && link && pubDate) {
      const dt = new Date(pubDate);
      if (!isNaN(dt.getTime())) {
        items.push({
          titulo: titulo.trim(),
          descricao: descricao.trim().substring(0, 500),
          link: link.trim(),
          publicado_em: dt.toISOString(),
        });
      }
    }
  }
  return items;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let news: NewsItem[] = [];
    let lastUrl = '';
    for (const url of RSS_URLS) {
      lastUrl = url;
      console.log(`[get-market-news] Tentando ${url}...`);
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Hub-Tailor-Partners/1.0)' },
      });
      if (!response.ok) {
        console.warn(`[get-market-news] ${url} retornou ${response.status}`);
        continue;
      }
      const xml = await response.text();
      news = parseRSS(xml);
      console.log(`[get-market-news] ${url} parseou ${news.length} notícias`);
      if (news.length > 0) break;
    }

    if (news.length === 0) {
      return new Response(JSON.stringify({ success: false, error: `Nenhuma notícia parseada (último: ${lastUrl})` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
      return new Response(JSON.stringify({ success: false, error: 'Nenhuma notícia parseada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of news) {
      const res = await fetch(`${supabaseUrl}/rest/v1/market_news_cache`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify({
          titulo: item.titulo,
          descricao: item.descricao,
          link: item.link,
          publicado_em: item.publicado_em,
          fonte: 'InfoMoney',
        }),
      });
      const body = await res.text();
      if (res.status === 201) inserted++;
      else if (res.status === 200 || res.status === 409) skipped++;
      else {
        errors++;
        console.error(`[get-market-news] Insert falhou status=${res.status} body=${body}`);
      }
    }

    console.log(`[get-market-news] OK inserted=${inserted} skipped=${skipped} errors=${errors}`);
    return new Response(JSON.stringify({
      success: true,
      inserted,
      skipped,
      errors,
      total: news.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[get-market-news] Erro:', err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
