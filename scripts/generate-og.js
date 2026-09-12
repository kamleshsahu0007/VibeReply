const sharp = require('sharp');
const fs = require('fs');

async function createOgImage() {
  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#02020a"/>
        <stop offset="50%" stop-color="#060919"/>
        <stop offset="100%" stop-color="#02020a"/>
      </linearGradient>
      <radialGradient id="cyanGlow" cx="20%" cy="30%" r="60%">
        <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#00f2fe" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="purpleGlow" cx="80%" cy="70%" r="60%">
        <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00f2fe"/>
        <stop offset="50%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#8b5cf6"/>
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bgGrad)"/>
    <rect width="1200" height="630" fill="url(#cyanGlow)"/>
    <rect width="1200" height="630" fill="url(#purpleGlow)"/>

    <!-- Subtle Tech Grid -->
    <g stroke="rgba(0, 242, 254, 0.06)" stroke-width="1">
      <line x1="100" y1="0" x2="100" y2="630"/>
      <line x1="300" y1="0" x2="300" y2="630"/>
      <line x1="500" y1="0" x2="500" y2="630"/>
      <line x1="700" y1="0" x2="700" y2="630"/>
      <line x1="900" y1="0" x2="900" y2="630"/>
      <line x1="1100" y1="0" x2="1100" y2="630"/>
      <line x1="0" y1="100" x2="1200" y2="100"/>
      <line x1="0" y1="250" x2="1200" y2="250"/>
      <line x1="0" y1="400" x2="1200" y2="400"/>
      <line x1="0" y1="550" x2="1200" y2="550"/>
    </g>

    <!-- Badge -->
    <rect x="90" y="85" width="220" height="38" rx="19" fill="rgba(0, 242, 254, 0.08)" stroke="rgba(0, 242, 254, 0.35)" stroke-width="1.5"/>
    <circle cx="112" cy="104" r="5" fill="#00f2fe"/>
    <text x="128" y="109" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#00f2fe" letter-spacing="1.5">NEURAL CORE v2.50</text>

    <!-- Title -->
    <text x="90" y="195" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" fill="#ffffff" letter-spacing="-1.5">
      VibeReply
    </text>

    <!-- Subtitle -->
    <text x="90" y="260" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="700" fill="#38bdf8">
      #1 AI Reply Generator &amp; Smart Chat Assistant
    </text>

    <!-- Description -->
    <text x="90" y="325" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" fill="#cbd5e1" font-weight="400">
      Contextual AI replies, custom tones, and instant 180+ language translations.
    </text>
    <text x="90" y="360" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" fill="#94a3b8" font-weight="400">
      Works inside WhatsApp Web, LinkedIn, Gmail, Slack &amp; any web text box.
    </text>

    <!-- Badges Row -->
    <g transform="translate(90, 440)">
      <!-- Pill 1 -->
      <rect x="0" y="0" width="180" height="46" rx="10" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1"/>
      <text x="22" y="29" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff">WhatsApp Web</text>

      <!-- Pill 2 -->
      <rect x="200" y="0" width="130" height="46" rx="10" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1"/>
      <text x="22" y="29" transform="translate(200, 0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff">LinkedIn</text>

      <!-- Pill 3 -->
      <rect x="350" y="0" width="120" height="46" rx="10" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1"/>
      <text x="24" y="29" transform="translate(350, 0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff">Gmail</text>

      <!-- Pill 4 -->
      <rect x="490" y="0" width="190" height="46" rx="10" fill="rgba(0, 242, 254, 0.12)" stroke="rgba(0, 242, 254, 0.45)" stroke-width="1"/>
      <text x="22" y="29" transform="translate(490, 0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#00f2fe">180+ Languages</text>
    </g>

    <!-- Star Rating Google Trust Badge -->
    <g transform="translate(90, 525)">
      <text x="0" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" fill="#fbbf24">★★★★★</text>
      <text x="95" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff">4.9 / 5.0</text>
      <text x="160" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" fill="#94a3b8">(1,280+ active users &amp; reviews)</text>
    </g>

    <!-- Floating Logo Graphic Right Side -->
    <g transform="translate(860, 150)">
      <circle cx="130" cy="130" r="145" fill="none" stroke="url(#logoGrad)" stroke-width="3" stroke-opacity="0.3"/>
      <circle cx="130" cy="130" r="115" fill="none" stroke="url(#logoGrad)" stroke-width="2" stroke-dasharray="14, 10" stroke-opacity="0.5"/>
      <rect x="20" y="20" width="220" height="220" rx="45" fill="#040714" stroke="url(#logoGrad)" stroke-width="3"/>
      
      <!-- Speech bubble & wave -->
      <g transform="translate(50, 50) scale(3.5)">
        <path d="M 20 6 C 12.27 6 6 12.27 6 20 C 6 22.88 6.87 25.55 8.37 27.76 L 6.5 33.5 L 12.48 31.72 C 14.69 33.14 17.26 34 20 34 C 27.73 34 34 27.73 34 20 C 34 12.27 27.73 6 20 6 Z"
              fill="#070D1F" stroke="url(#logoGrad)" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M 10.5 20.5 H 14 L 16.5 15.5 L 19.5 25.5 L 23.5 12.5 L 26.5 22 L 28 19 H 29.5"
              stroke="url(#logoGrad)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="29.5" cy="19" r="1.25" fill="#00F2FE"/>
      </g>
    </g>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile('public/og-image.png');
  console.log('SUCCESS: og-image.png created at public/og-image.png (1200x630)');
}

createOgImage().catch(console.error);
