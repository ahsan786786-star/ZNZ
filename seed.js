'use strict';
/**
 * Seeds data/db.json with the first-run content.
 * Run:  node seed.js            (keeps existing db.json unless --force)
 *       node seed.js --force    (reset everything back to defaults)
 */
const fs = require('fs');
const path = require('path');
const { make } = require('./lib/auth');

const FORCE = process.argv.includes('--force');
const DB = path.join(__dirname, 'data', 'db.json');
if (fs.existsSync(DB) && !FORCE) {
  console.log('db.json already exists — use --force to reset.');
  process.exit(0);
}

const USER = process.env.ADMIN_USER || 'admin';
const PASS = process.env.ADMIN_PASS || 'ZnZ2026';
const PIN = process.env.ADMIN_PIN || '2026';

const p = make(PASS);
const pin = make(PIN);
const ownerPass = make(process.env.OWNER_PASS || 'admin123');
const ownerPin = make(process.env.OWNER_PIN || '998877');
const uid = (pre) => pre + Math.random().toString(36).slice(2, 8);

const IMG = '/assets/img';

const db = {
  admin: {
    username: USER,
    passSalt: p.salt, passHash: p.hash,
    pinSalt: pin.salt, pinHash: pin.hash,
    updatedAt: new Date().toISOString()
  },

  owner: {
    username: process.env.OWNER_USER || '1234567890123',
    passSalt: ownerPass.salt, passHash: ownerPass.hash,
    pinSalt: ownerPin.salt, pinHash: ownerPin.hash,
    updatedAt: new Date().toISOString()
  },

  settings: {
    brand: {
      name: 'Z&Z',
      fullName: 'Zain & Zara',
      tagline: 'Luxury Bridals & Formals',
      welcomeWord: 'Welcome',
      logo: `${IMG}/logo-3d@2x.png`,
      logoFlat: `${IMG}/logo-gold@2x.png`,
      welcomeSize: 62,
      favicon: `${IMG}/logo-mark.png`
    },
    contact: { phone: '', whatsapp: '', email: '', whatsappMessage: 'Hello Z&Z! I would like to know more about your bridal collection.' },
    notice: {
      enabled: true,
      text: 'New Eid Edit is live — free delivery on all orders above PKR 50,000. Limited pieces only!',
      link: ''
    },
    social: { instagram: '', facebook: '', youtube: '', tiktok: '', snapchat: '', pinterest: '' },
    theme: { bgLight: '#f7f2e8', bgDark: '#08080a', gold: '#c9a54e', goldDeep: '#8a6a26', defaultMode: 'light' },
    hero: {
      autoplay: true,
      intervalSec: 3,
      posters: [
        { id: uid('p'), url: `${IMG}/posters/poster-1.webp`, alt: 'Z&Z luxury bridal campaign — ivory and gold bridal lehenga' },
        { id: uid('p'), url: `${IMG}/posters/poster-2.webp`, alt: 'Z&Z formal wear — maroon and gold embroidered couture' }
      ]
    },
    hotSelling: { enabled: true, mode: 'best', collectionId: '', layout: 'wheel', limit: 12, title: 'Most Loved This Season' },
    collectionPage: { layout: 'wheel', title: 'Collections' },
    valuable: {
      enabled: true,
      delayMs: 3500,
      title: 'Become Our Valuable Customer',
      text: 'Join the Z&Z inner circle — early access to new bridal drops, private sale invites and special member discounts.'
    },
    currency: {
      enabled: true,
      base: 'PKR',
      list: [
        { code: 'PKR', symbol: 'Rs', rate: 1 },
        { code: 'USD', symbol: '$', rate: 0.0036 },
        { code: 'SAR', symbol: 'SAR', rate: 0.0135 },
        { code: 'AED', symbol: 'AED', rate: 0.0132 },
        { code: 'GBP', symbol: '£', rate: 0.0028 }
      ]
    },
    terms: { text: '', image: '' },
    about: {
      heading: 'The House of Z&Z',
      text: 'Z&Z is a couture house for the modern bride — hand-embellished bridals and formals crafted by master artisans, made to measure for your most important days.',
      image: ''
    },
    branches: [],
    order: {
      thankYou: 'Thank you for your order! Please attend our call for order confirmation — our team will contact you shortly.'
    },
    seo: {
      title: 'Z&Z — Luxury Bridal Dresses, Barat, Walima & Mehndi Wear in Pakistan',
      description: 'Shop luxury Pakistani bridal dresses at Z&Z. Hand-embroidered barat lehengas, walima gowns, mehndi wear and party formals. Nationwide delivery, made to measure couture.',
      keywords: 'bridal dresses, pakistani bridal dresses, barat lehenga, walima dress, mehndi dress, party wear, luxury bridal wear, Z&Z bridals, bridal couture pakistan'
    }
  },

  collections: [
    {
      id: 'barat', name: 'Barat Wear', order: 1, enabled: true,
      image: `${IMG}/collections/barat.webp`, imageThumb: `${IMG}/collections/barat-sm.webp`,
      banner: `${IMG}/posters/poster-2.webp`,
      description: 'Heirloom reds, deep emerald and antique gold — the Z&Z barat edit.',
      items: [
        {
          id: 'zohra', name: 'Zohra — Crimson Zardozi Lehenga', price: 285000, order: 1,
          desc: 'Deep crimson raw silk lehenga with hand zardozi, dabka and sequin work. Includes heavily worked dupatta and worked bodice.',
          images: [`${IMG}/dresses/barat-1.webp`, `${IMG}/collections/barat.webp`],
          thumbs: [`${IMG}/dresses/barat-1-sm.webp`, `${IMG}/collections/barat-sm.webp`],
          views: 0, tags: ['bridal', 'barat']
        },
        {
          id: 'noor', name: 'Noor — Emerald Velvet Bridal', price: 0, order: 2,
          desc: 'Emerald velvet bridal with antique gold dabka and kora work. Price on request — contact us on WhatsApp.',
          images: [`${IMG}/collections/barat.webp`],
          thumbs: [`${IMG}/collections/barat-sm.webp`],
          views: 0, tags: ['bridal', 'barat']
        }
      ]
    },
    {
      id: 'walima', name: 'Walima Wear', order: 2, enabled: true,
      image: `${IMG}/collections/walima.webp`, imageThumb: `${IMG}/collections/walima-sm.webp`,
      banner: '',
      description: 'Ivory, pearl and blush — softly glowing walima couture.',
      items: [
        {
          id: 'mahtab', name: 'Mahtab — Ivory Pearl Gown', price: 178000, order: 1,
          desc: 'Ivory organza gown with delicate gold thread work and pearl detailing, finished with a soft tulle dupatta.',
          images: [`${IMG}/dresses/walima-1.webp`, `${IMG}/collections/walima.webp`],
          thumbs: [`${IMG}/dresses/walima-1-sm.webp`, `${IMG}/collections/walima-sm.webp`],
          views: 0, tags: ['walima', 'formal']
        }
      ]
    },
    {
      id: 'mehndi', name: 'Mehndi Wear', order: 3, enabled: true,
      image: `${IMG}/collections/mehndi.webp`, imageThumb: `${IMG}/collections/mehndi-sm.webp`,
      banner: '',
      description: 'Vivid chartreuse, mirror work and gota — made to dance in.',
      items: [
        {
          id: 'sahar', name: 'Sahar — Chartreuse Mirror Lehenga', price: 96000, order: 1,
          desc: 'Chartreuse silk lehenga with hand mirror work and gold gota edging. Lightweight and made to twirl.',
          images: [`${IMG}/dresses/mehndi-1.webp`, `${IMG}/collections/mehndi.webp`],
          thumbs: [`${IMG}/dresses/mehndi-1-sm.webp`, `${IMG}/collections/mehndi-sm.webp`],
          views: 0, tags: ['mehndi']
        }
      ]
    },
    {
      id: 'party', name: 'Party Wear', order: 4, enabled: true,
      image: `${IMG}/collections/party.webp`, imageThumb: `${IMG}/collections/party-sm.webp`,
      banner: '',
      description: 'Champagne shimmer and modern silhouettes for evenings.',
      items: [
        {
          id: 'lumen', name: 'Lumen — Champagne Sequin Gown', price: 62000, order: 1,
          desc: 'Liquid champagne sequins with a draped shoulder and fitted silhouette. Fully lined.',
          images: [`${IMG}/dresses/party-1.webp`, `${IMG}/collections/party.webp`],
          thumbs: [`${IMG}/dresses/party-1-sm.webp`, `${IMG}/collections/party-sm.webp`],
          views: 0, tags: ['party']
        }
      ]
    }
  ],

  leads: [],
  complaints: [],
  ratings: [],
  orders: [],
  subscribers: []
};

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
fs.writeFileSync(DB, JSON.stringify(db, null, 2));
console.log('✔ seeded data/db.json');
console.log(`  username: ${USER}`);
console.log(`  password: ${PASS}`);
console.log(`  pin:      ${PIN}`);
