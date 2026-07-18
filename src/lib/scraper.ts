import dns from 'dns';
import { promisify } from 'util';
import { URL } from 'url';

const lookupPromise = promisify(dns.lookup);

// List of private IP ranges (CIDR-like checks)
function isPrivateIp(ip: string): boolean {
  // IPv6 loopback
  if (ip === '::1') return true;

  // IPv4 loopback & private subnets
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    const [p0, p1, p2, p3] = parts;
    // 127.0.0.0/8 (Loopback)
    if (p0 === 127) return true;
    // 10.0.0.0/8 (Private)
    if (p0 === 10) return true;
    // 172.16.0.0/12 (Private)
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (p0 === 192 && p1 === 168) return true;
    // 169.254.0.0/16 (Link Local)
    if (p0 === 169 && p1 === 254) return true;
    // 0.0.0.0/8 (Current network)
    if (p0 === 0) return true;
  }

  // IPv6 private ranges (starts with fe80, fc00, fd00, etc.)
  if (ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }

  return false;
}

export interface WebMetadata {
  title: string;
  description: string;
  domain: string;
  url: string;
  previewImage: string;
  faviconUrl: string;
}

export async function fetchWebMetadata(urlStr: string): Promise<WebMetadata> {
  try {
    // 1. Validate URL parsing
    const parsedUrl = new URL(urlStr);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS protocols are allowed.');
    }

    const hostname = parsedUrl.hostname;
    if (!hostname) {
      throw new Error('Invalid hostname.');
    }

    // 2. Resolve Hostname to IP and validate against SSRF
    let resolvedIp: string;
    try {
      const lookupResult = await lookupPromise(hostname);
      resolvedIp = lookupResult.address;
    } catch (err) {
      throw new Error(`Failed to resolve hostname: ${hostname}`);
    }

    if (isPrivateIp(resolvedIp)) {
      throw new Error('Access to private/local networks is forbidden.');
    }

    // 3. Fetch webpage (with a 5-second timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(urlStr, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Recall/1.0 AI-Personal-Digital-Memory',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP status error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error(`Invalid content type: ${contentType}. Only HTML content can be parsed.`);
    }

    // Read response body up to 2MB to prevent large file memory exhaustion
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Could not read response body stream.');
    }

    let chunks: Uint8Array[] = [];
    let totalLength = 0;
    const MAX_SCRAPE_SIZE = 2 * 1024 * 1024; // 2MB limit

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalLength += value.length;
        if (totalLength > MAX_SCRAPE_SIZE) {
          controller.abort();
          break;
        }
      }
    }

    const mergedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      mergedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const htmlText = new TextDecoder('utf-8').decode(mergedBuffer);

    // 4. Parse Metadata using standard regex matching (lightweight, safe, dependency-free)
    const titleMatch = htmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : '';

    // OG Title fallback
    if (!title) {
      const ogTitleMatch = htmlText.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                           htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
      title = ogTitleMatch ? ogTitleMatch[1] : '';
    }

    // Fallback to URL path/domain if title is still empty
    if (!title) {
      title = parsedUrl.pathname !== '/' ? parsedUrl.pathname.substring(1) : hostname;
    }

    // Decode HTML entities in title (basic decoder)
    title = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");

    // Description Match
    let description = '';
    const descMatch = htmlText.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                      htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
                      htmlText.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                      htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    if (descMatch) {
      description = descMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
    }

    // Preview Image Match
    let previewImage = '';
    const ogImgMatch = htmlText.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                       htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogImgMatch) {
      previewImage = ogImgMatch[1];
      if (previewImage.startsWith('/')) {
        previewImage = `${parsedUrl.origin}${previewImage}`;
      }
    }

    // Favicon URL Match
    let faviconUrl = '';
    const favMatch = htmlText.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ||
                     htmlText.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
    if (favMatch) {
      faviconUrl = favMatch[1];
    } else {
      faviconUrl = '/favicon.ico'; // default
    }

    if (faviconUrl.startsWith('//')) {
      faviconUrl = `${parsedUrl.protocol}${faviconUrl}`;
    } else if (faviconUrl.startsWith('/')) {
      faviconUrl = `${parsedUrl.origin}${faviconUrl}`;
    } else if (faviconUrl && !faviconUrl.startsWith('http')) {
      faviconUrl = `${parsedUrl.origin}/${faviconUrl}`;
    }

    return {
      title,
      description: description || 'No description available.',
      domain: hostname,
      url: urlStr,
      previewImage: previewImage || '',
      faviconUrl: faviconUrl || `${parsedUrl.origin}/favicon.ico`
    };
  } catch (error: any) {
    if (error.message.includes('private/local networks') || error.message.includes('forbidden')) {
      throw error;
    }
    console.error('Scrape error:', error);
    // Graceful error fallback but still returns useful model
    const domain = new URL(urlStr).hostname;
    return {
      title: domain,
      description: `Saved link from ${domain}. Metadata extraction failed: ${error.message}`,
      domain,
      url: urlStr,
      previewImage: '',
      faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    };
  }
}
