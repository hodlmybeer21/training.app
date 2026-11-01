import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// No ISR / revalidate in this app, so no R2 incremental cache is needed.
export default defineCloudflareConfig();
