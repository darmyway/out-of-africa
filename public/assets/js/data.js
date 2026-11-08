/* =========================================================
   ARTISTS AND ARTWORKS
   The only file you edit to add artists and art.
   README.md has a step by step guide.

   Photos: put them in assets/img/artworks/ or assets/img/artists/
   and write the path, e.g. "assets/img/artworks/lion-throne-front.jpg"
   Leave a field "" (or null for price) and it is hidden on the site.
   ========================================================= */

window.ARTISTS = [
  {
    id: "stan-kisilu",                       // used in links: lowercase, no spaces
    name: "Stan Kisilu",
    country: "Kenya",
    city: "",
    disciplines: ["Wood carving"],
    portrait: "assets/img/artists/stan-kisilu.jpg",
    short: "Kenyan woodcarver who turns a single idea into a finished piece, from animal figures to carved furniture.",
    highlights: [
      "Kenyan woodcarver working mostly to commission, shaping a client's idea into a finished piece.",
      "Carves around four pieces a month, each one by hand.",
      "Has trained other carvers in his community, passing on the techniques behind his work.",
      "Experienced in shipping work abroad, including larger animal sculptures."
    ],
    bio: [
      "Stan Kisilu is a woodcarver based in Kenya. Much of his work begins as a conversation: a client describes an idea, and Stan shapes it into a carving by hand.",
      "His pieces range from animal figures to statement furniture such as his carved lion throne."
    ],
    approach: "",                            // tools, woods and process, in the artist's words
    acceptsCommissions: true,
    featured: true
  }

  /* To add an artist: copy the block above, paste it after a comma,
     and change the details. */
];

window.ARTWORKS = [
  /* Titles are working titles: confirm each one, plus size, weight,
     wood and price, with Stan, then fill them in below. */
  {
    id: "the-big-five-of-africa", title: "The Big Five of Africa", artist: "stan-kisilu", category: "Wall sculpture",
    medium: "Hand carved wood, polished", dimensions: "", weight: "", year: "", price: null, status: "available",
    images: ["assets/img/artworks/the-big-five-of-africa.jpg"],
    alt: "Africa-shaped carved wall panel with the heads of an elephant, lion, leopard, buffalo and rhino",
    description: "A wall panel carved in the shape of the African continent, with the Big Five rising out of the wood: elephant, lion, leopard, buffalo and rhino, each head carved in deep relief and polished to a dark sheen.",
    featured: true, added: "2026-11-08"
  },
  {
    id: "pride-and-buffalo", title: "Pride and Buffalo", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood, polished", price: null, status: "available",
    images: ["assets/img/artworks/pride-and-buffalo.jpg"],
    alt: "Polished carving of lions bringing down a Cape buffalo",
    description: "Three lions bring down a Cape buffalo in a single carved scene. Muscles, manes and the sweep of the buffalo's horns are drawn out of the wood and polished to a deep, glowing finish.",
    featured: true, added: "2026-11-08"
  },
  {
    id: "prowling-cheetah", title: "Prowling Cheetah", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood, polished", price: null, status: "available",
    images: ["assets/img/artworks/prowling-cheetah.jpg"],
    alt: "Tall polished wooden cheetah carving mid stride",
    description: "A lean, long-legged cheetah caught mid stride, its head low and watchful. A free-standing statement piece with a smooth, dark polished finish.",
    featured: true, added: "2026-11-07"
  },
  {
    id: "under-the-acacia", title: "Under the Acacia", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood on a natural wood base", price: null, status: "available",
    images: ["assets/img/artworks/under-the-acacia.jpg"],
    alt: "Carved elephant family and a giraffe beside a bare tree on a wooden base",
    description: "An elephant family walks past a giraffe beneath a bare acacia, all carved and set together on a natural wood base. A whole savannah moment in one piece.",
    featured: true, added: "2026-11-07"
  },
  {
    id: "sleeping-lion", title: "Sleeping Lion", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood, polished", price: null, status: "available",
    images: ["assets/img/artworks/sleeping-lion.jpg"],
    alt: "Polished wooden lion resting its head on its paws",
    description: "A lion at rest, head lowered onto its paws, carved on a textured base. The mane, ribs and paws are carved in fine detail and the grain glows through the polish.",
    featured: true, added: "2026-11-06"
  },
  {
    id: "lions-on-the-branch", title: "Lions on the Branch", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood, natural red finish", price: null, status: "available",
    images: ["assets/img/artworks/lions-on-the-branch.jpg"],
    alt: "Lions carved climbing along a single branch of red wood",
    description: "A pride climbs along a single branch, each cat carved out of the same piece of red-toned wood and finished to show off the grain.",
    featured: true, added: "2026-11-06"
  },
  {
    id: "leopards-on-the-branch", title: "Leopards on the Branch", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood, polished", price: null, status: "available",
    images: ["assets/img/artworks/leopards-on-the-branch.jpg"],
    alt: "Three polished big cats resting along a carved branch",
    description: "Three big cats stretch out along a carved branch, the smooth polished bodies set against the rough, bark-textured wood.",
    featured: true, added: "2026-11-05"
  },
  {
    id: "cape-buffalo", title: "Cape Buffalo", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood, natural red finish", price: null, status: "available",
    images: ["assets/img/artworks/cape-buffalo.jpg"],
    alt: "Red-toned wooden Cape buffalo with head lowered",
    description: "A Cape buffalo with its head lowered and horns sweeping forward, carved in warm red-toned wood with every muscle defined.",
    featured: true, added: "2026-11-05"
  },
  {
    id: "the-great-migration", title: "The Great Migration", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood", price: null, status: "available",
    images: ["assets/img/artworks/the-great-migration.jpg"],
    alt: "A dense herd of carved animals moving along a long wooden log",
    description: "A whole herd surges along a single log, dozens of animals carved shoulder to shoulder in one piece of wood. A large, dramatic centrepiece.",
    added: "2026-11-04"
  },
  {
    id: "standing-antelope", title: "Standing Antelope", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood, polished", price: null, status: "available",
    images: ["assets/img/artworks/standing-antelope.jpg"],
    alt: "Free-standing carved antelope with tall ringed horns",
    description: "A graceful, free-standing antelope with tall ringed horns, carved and polished to a smooth finish.",
    added: "2026-11-04"
  },
  {
    id: "the-buffalo-hunt-study", title: "The Buffalo Hunt", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood", price: null, status: "available",
    images: ["assets/img/artworks/the-buffalo-hunt-study.jpg"],
    alt: "Carving of lions attacking a Cape buffalo, with a textured finish",
    description: "Lions leap onto a Cape buffalo in a carving full of movement, left with a textured, hand-worked finish that shows every tool mark.",
    added: "2026-11-03"
  },
  {
    id: "standing-lion-life-size", title: "Standing Lion, Life Size", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood", price: null, status: "commission",
    images: ["assets/img/artworks/standing-lion-life-size.jpg"],
    alt: "Life-size wooden lion carving, standing, before final finishing",
    description: "A life-size standing lion carved from solid wood, shown here before final finishing. Pieces on this scale are made to order; ask about commissioning one.",
    added: "2026-11-03"
  },
  {
    id: "the-lions-throne", title: "The Lion's Throne", artist: "stan-kisilu", category: "Wood carving",
    medium: "Hand carved wood", price: null, status: "available", images: [],
    alt: "Carved wooden throne with a lion's head backrest, lion armrests and paw feet",
    description: "A throne carved by hand with a lion's head, mane and paws drawn out of the wood, framed by detailed decorative carving.",
    draft: true, added: "2026-11-02"   // hidden until a photo is added
  }
];
