/**
 * Headless browsers rented from cloud providers look like ordinary Chrome, so the user-agent check misses
 * them. Cloudflare tells us which network a request came from; people browse from home, office and mobile
 * networks, not from a hosting provider.
 */
const HOSTING_ASNS = new Set([
  16509, 14618, // Amazon
  15169, 396982, 19527, // Google Cloud
  8075, // Microsoft Azure
  45090, 132203, // Tencent Cloud
  37963, 45102, // Alibaba Cloud
  14061, // DigitalOcean
  16276, // OVH
  24940, // Hetzner
  63949, // Akamai Connected Cloud (Linode)
  31898, // Oracle Cloud
  20473, // Vultr
  51167, // Contabo
  60781, 28753, // Leaseweb
  12876, // Scaleway
  9009, // M247
  47583, // Hostinger
  8560, // IONOS
  60068, // Datacamp
  136907, // Huawei Cloud
  55990, // Huawei Cloud
]);

// Hosting words only. "google" alone would catch Google Fiber (a home ISP), "akamai" and "cloud" would catch
// iCloud Private Relay and Cloudflare WARP, which carry real people.
const HOSTING_NAME =
  /amazon|aws|google (llc|cloud)|googleusercontent|microsoft|azure|tencent|alibaba|aliyun|digitalocean|ovh|hetzner|linode|akamai connected cloud|oracle|vultr|choopa|contabo|leaseweb|scaleway|m247|datacamp|hostinger|ionos|hosting|datacenter|data center|colocation|vps/i;

/** Why a request counts as automated, or null when it looks like a person. */
export function datacenterReason(asn: unknown, org: unknown): string | null {
  const n = typeof asn === 'number' ? asn : parseInt(String(asn ?? ''), 10);
  const name = typeof org === 'string' ? org.trim() : '';
  if (Number.isFinite(n) && HOSTING_ASNS.has(n)) return `datacenter: AS${n}${name ? ' ' + name : ''}`.slice(0, 120);
  if (name && HOSTING_NAME.test(name)) return `datacenter: ${name}`.slice(0, 120);
  return null;
}
