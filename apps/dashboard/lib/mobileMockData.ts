export const DEMO_PROFILE = {
  id: "demo-user-001",
  username: "Yeriel",
  total_points: 1250,
  streak_count: 7,
  level: 5,
};

export const DEMO_EVENTS = [
  { id: "e1", title: "Monas Canal Cleanup", date: "2026-06-01", location: "Monas, Jakarta Pusat", attendees: 34, category: "cleanup" },
  { id: "e2", title: "Handwashing Drive – SD Negeri 05", date: "2026-06-03", location: "Gambir", attendees: 12, category: "hygiene" },
  { id: "e3", title: "Water Quality Testing Day", date: "2026-06-07", location: "Kali Ciliwung", attendees: 20, category: "water" },
];

export const DEMO_WATER_QUALITY = [
  { id: "w1", location: "Monas Tap", score: 82, label: "Good" },
  { id: "w2", location: "Kali Ciliwung", score: 45, label: "Poor" },
  { id: "w3", location: "PAM Jatinegara", score: 91, label: "Excellent" },
];

export const DEMO_BINGO_CELLS = [
  { id: "b0", category: "Plastic Bottle", submitted: true },
  { id: "b1", category: "Food Wrapper", submitted: false },
  { id: "b2", category: "Cigarette Butt", submitted: true },
  { id: "b3", category: "Glass Shard", submitted: false },
  { id: "b4", category: "Styrofoam", submitted: true },
  { id: "b5", category: "Cardboard", submitted: false },
  { id: "b6", category: "Metal Can", submitted: false },
  { id: "b7", category: "Plastic Bag", submitted: false },
  { id: "b8", category: "Paper Cup", submitted: false },
];

export const DEMO_LEADERBOARD = [
  { rank: 1, username: "siti_jakarta", points: 4200, level: 8, isMe: false },
  { rank: 2, username: "budi_clean", points: 3850, level: 7, isMe: false },
  { rank: 3, username: "rini_wash", points: 3200, level: 7, isMe: false },
  { rank: 4, username: "adi_green", points: 2780, level: 6, isMe: false },
  { rank: 5, username: "Yeriel", points: 1250, level: 5, isMe: true },
  { rank: 6, username: "dewi_eco", points: 1100, level: 4, isMe: false },
  { rank: 7, username: "farid_care", points: 980, level: 4, isMe: false },
  { rank: 8, username: "nisa_river", points: 870, level: 3, isMe: false },
  { rank: 9, username: "tommy_h2o", points: 760, level: 3, isMe: false },
  { rank: 10, username: "yanti_bersih", points: 650, level: 3, isMe: false },
];

export const DEMO_VOUCHERS = [
  { id: "v1", title: "Free Mie Goreng", partner: "Warung Pak Budi", points_cost: 300, category: "food", description: "Redeem for one free portion of mie goreng at any participating outlet.", stock: 15 },
  { id: "v2", title: "10% off Groceries", partner: "Indomaret", points_cost: 500, category: "shopping", description: "10% discount on any grocery purchase above Rp 50,000.", stock: 8 },
  { id: "v3", title: "Free Water Test Kit", partner: "WASH360 Lab", points_cost: 200, category: "health", description: "Claim a free household water testing kit — valid 30 days.", stock: 50 },
  { id: "v4", title: "GoRide Credit Rp 10k", partner: "Gojek", points_cost: 800, category: "transport", description: "Rp 10,000 GoRide credit for your next eco-friendly commute.", stock: 5 },
];

export const DEMO_REPORT_TYPES = [
  { id: "illegal_dumping", label: "Illegal Dumping", emoji: "🗑️" },
  { id: "clogged_drain", label: "Clogged Drain", emoji: "🚰" },
  { id: "broken_tap", label: "Broken Tap", emoji: "💧" },
  { id: "open_defecation", label: "Open Defecation", emoji: "⚠️" },
  { id: "flood_risk", label: "Flood Risk", emoji: "🌊" },
  { id: "other", label: "Other Issue", emoji: "📝" },
];
