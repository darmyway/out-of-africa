/* =========================================================
   SITE SETTINGS
   Change these values and the whole site updates.
   ========================================================= */
window.SITE = {
  name: "Out of Africa",

  // Thin bar at the very top of every page. Leave "" to hide it.
  announcement: "Original works by African artists · Shipping quoted to your country before you pay",

  // Where enquiries, applications and order requests go. Fill in at least one.
  email: "",          // e.g. "hello@yourdomain.com"
  whatsapp: "",       // digits only with country code, e.g. "2348012345678"

  // Recommended: a form service, so messages arrive in your inbox without
  // the visitor leaving the page. Works with Formspree or Web3Forms.
  //   Formspree: formEndpoint = "https://formspree.io/f/xxxxxxx"
  //   Web3Forms: formEndpoint = "https://api.web3forms.com/submit", formAccessKey = "your-key"
  formEndpoint: "",
  formAccessKey: "",

  currency: "USD",

  // Price filter on the Explore page (in your currency)
  priceBands: [500, 1500, 3000],

  // Proposed split shown on the For Artists page
  terms: {
    artistShare: 75,
    marketplaceShare: 25,
    shipping: "Paid separately by the buyer",
    payout: "Agreed with each artist before listing",
    label: "Proposal · confirmed with each artist"
  },

  // Moving strip of words on the homepage
  marquee: [
    "Discover the art",
    "Meet the person behind it",
    "Open call: African artists wanted",
    "Shipping quoted for your country",
    "Commissions welcome"
  ],

  // Open spaces on the Artist Wall. Disciplines that already have an
  // artist are skipped automatically.
  openCall: [
    { form: "Painting",     who: "painters",           text: "Canvas, board or wall. Colour that changes a room." },
    { form: "Sculpture",    who: "sculptors",          text: "Stone, metal, clay or bronze. Form you can walk around." },
    { form: "Textiles",     who: "textile artists",    text: "Weaving, dyeing, embroidery and cloth with a voice." },
    { form: "Ceramics",     who: "ceramicists",        text: "Vessels and objects shaped by hand and fire." },
    { form: "Photography",  who: "photographers",      text: "Images that hold a place, a person or a moment." },
    { form: "Mixed media",  who: "mixed media artists", text: "Work that refuses to sit in one category." },
    { form: "Printmaking",  who: "printmakers",        text: "Linocut, etching, screenprint. The art of the edition." },
    { form: "Drawing",      who: "illustrators",        text: "Charcoal, graphite and ink, drawn with patience." }
  ],

  // While you are adding real photos, true shows the placeholder works.
  // Set to false before you share the site.
  showDrafts: false,

  // Fixed images for specific spots. Any spot not listed here is filled
  // automatically from the artwork photos.
  images: {
    hero: "assets/img/hero-big-five.jpg",
    pov: "assets/img/banner-under-the-acacia.jpg",
    detail: "assets/img/artworks/sleeping-lion.jpg",
    "feature-detail": "assets/img/artworks/sleeping-lion.jpg",
    "story-2": "assets/img/artists/stan-kisilu-workshop.jpg",
    "artists-hero": "assets/img/artists/stan-kisilu-workshop.jpg"
  },

  social: { instagram: "", facebook: "" },

  credit: "Website by Adekanye Damilola"
};
