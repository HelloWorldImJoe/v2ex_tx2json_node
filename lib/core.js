const fetch = require('node-fetch');

const FIELD_TR_RE = /<tr>\s*<td[^>]*>\s*([^<]+)\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
const IMG_TAG_RE = /<img[^>]*>/i;
const IMG_SRC_RE = /\bsrc="([^"]+)"/i;
const IMG_ALT_RE = /\balt="([^"]+)"/i;

const HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-language': 'zh-CN,zh;q=0.6',
  'cache-control': 'max-age=0',
  'content-type': 'application/x-www-form-urlencoded',
  origin: 'https://v2ex.com',
  priority: 'u=0, i',
  referer: 'https://v2ex.com/solana/tx',
  'sec-ch-ua': '"Brave";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'sec-gpc': '1',
  'upgrade-insecure-requests': '1',
  'user-agent': 'node-fetch'
};

function buildHeaders(baseUrl) {
  const h = Object.assign({}, HEADERS);
  const base = (baseUrl || '').replace(/\/+$/, '');
  h.origin = base || h.origin;
  h.referer = `${base}/solana/tx`;
  return h;
}

function extractAvatarAndName(tdHtml) {
  const imgMatch = tdHtml.match(IMG_TAG_RE);
  let username = null;
  let avatar = null;
  let uid = null;
  if (imgMatch) {
    const tag = imgMatch[0];
    const altM = tag.match(IMG_ALT_RE);
    const srcM = tag.match(IMG_SRC_RE);
    if (altM) username = altM[1].trim();
    if (srcM) avatar = srcM[1].trim();
    const uidM = tag.match(/data-uid="([^"]+)"/);
    if (uidM) uid = uidM[1].trim();
  }

  if (!username) {
    const text = tdHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) {
      const parts = text.split(' ');
      username = parts[parts.length - 1];
    }
  }

  return { username, avatar, uid };
}

function stripTags(s) {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, '').trim();
}

function extractFieldsFromHtml(html) {
  const fields = {};
  let m;
  while ((m = FIELD_TR_RE.exec(html)) !== null) {
    const key = (m[1] || '').trim();
    const valHtml = (m[2] || '').trim();
    fields[key] = valHtml;
  }

  if (!('交易哈希' in fields) && !('Transaction Hash' in fields)) {
    return null;
  }

  const txHashHtml = fields['交易哈希'] || fields['Transaction Hash'];
  const tx_hash = stripTags(txHashHtml);

  const sender_html = fields['发送方'] || fields['Sender'] || '';
  const receiver_html = fields['接收方'] || fields['Receiver'] || '';

  const sender = extractAvatarAndName(sender_html);
  const receiver = extractAvatarAndName(receiver_html);

  const token_type = (stripTags(fields['代币类型'] || fields['Token Type'] || '')) || null;
  const token_address = (stripTags(fields['Token Account'] || fields['Token Account'] || '')) || null;
  const amount = (stripTags(fields['数额'] || fields['Amount'] || '')) || null;
  const send_time = (stripTags(fields['发送时间'] || fields['Time'] || '')) || null;
  const memo = (stripTags(fields['附言（只对发送者或者接收者可见）'] || fields['Memo'] || '')) || null;

  let amount_value = null;
  if (amount) {
    const numM = amount.replace(/,/g, '').match(/([-+]?[0-9]*\.?[0-9]+)/);
    if (numM) {
      const v = parseFloat(numM[1]);
      if (!Number.isNaN(v)) amount_value = v;
    }
  }

  // extract topic id from memo like 'topic:12345'
  let topic_id = null;
  if (memo) {
    // relaxed pattern (no word-boundary) to avoid boundary issues in some inputs
    const t = memo.match(/topic\s*[:\-]?\s*(\d+)/i);
    if (t) {
      const n = parseInt(t[1], 10);
      if (!Number.isNaN(n)) topic_id = n;
    }
  }

  return {
    tx_hash,
    sender: {
      username: sender.username,
      avatar: sender.avatar,
      uid: sender.uid
    },
    receiver: {
      username: receiver.username,
      avatar: receiver.avatar,
      uid: receiver.uid
    },
    token_type,
    token_address,
    amount,
    amount_value,
    time: send_time,
    memo,
    topic_id
  };
}

class FetchError extends Error {}
class ParseError extends Error {}

class TX2JSON {
  constructor(baseUrl, cookie) {
    this.baseUrl = (baseUrl || '').replace(/\/+$/, '');
    this.cookie = cookie;
  }

  async fetchHtmlForTx(tx) {
    const headers = buildHeaders(this.baseUrl);
    if (this.cookie) headers['Cookie'] = this.cookie;
    const postUrl = `${this.baseUrl}/solana/tx`;
    const body = new URLSearchParams({ tx }).toString();
    let resp;
    try {
      resp = await fetch(postUrl, {
        method: 'POST',
        headers,
        body
      });
    } catch (err) {
      throw new FetchError(`error fetching tx HTML: ${err.message}`);
    }

    if (!resp.ok) throw new FetchError(`non-200 response code: ${resp.status}`);
    const text = await resp.text();
    if (text.includes('接收方') || text.includes('Receiver')) return text;
    throw new FetchError('response did not contain expected transaction HTML');
  }

  async parse(tx) {
    const html = await this.fetchHtmlForTx(tx);
    if (!html) return null;
    const parsed = extractFieldsFromHtml(html);
    if (!parsed) throw new ParseError('transaction hash not found in HTML');
    return parsed;
  }
}

module.exports = { TX2JSON, extractFieldsFromHtml, extractAvatarAndName };
