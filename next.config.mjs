/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: false, // Re-enable TypeScript checks since we fixed the issues
    },
    images: {
        unoptimized: true,
    },
}

export default nextConfig