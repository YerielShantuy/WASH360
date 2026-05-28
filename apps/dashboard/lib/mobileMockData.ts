export const DEMO_PROFILE = {
  id: "demo-user-001",
  username: "Alex",
  total_points: 1250,
  streak_count: 7,
  level: 5,
};

export const DEMO_EVENTS = [
  { id: "e1", title: "Bondi Beach Cleanup", date: "2026-06-07", location: "Bondi Beach, NSW", attendees: 34, category: "cleanup" },
  { id: "e2", title: "Handwashing Drive – Alexandria Primary", date: "2026-06-10", location: "Alexandria, NSW", attendees: 12, category: "hygiene" },
  { id: "e3", title: "Parramatta River Water Testing", date: "2026-06-14", location: "Parramatta, NSW", attendees: 20, category: "water" },
  { id: "e4", title: "Manly Cove Rubbish Pick-Up", date: "2026-06-21", location: "Manly, NSW", attendees: 28, category: "cleanup" },
];

export const DEMO_WATER_QUALITY = [
  { id: "w1", location: "Bondi Beach Tap", score: 88, label: "Good" },
  { id: "w2", location: "Parramatta River", score: 52, label: "Fair" },
  { id: "w3", location: "Sydney Harbour", score: 79, label: "Good" },
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
  { rank: 1, username: "ocean_alice", points: 4200, level: 8, isMe: false },
  { rank: 2, username: "clean_ben", points: 3850, level: 7, isMe: false },
  { rank: 3, username: "sophie_wash", points: 3200, level: 7, isMe: false },
  { rank: 4, username: "green_tom", points: 2780, level: 6, isMe: false },
  { rank: 5, username: "Alex", points: 1250, level: 5, isMe: true },
  { rank: 6, username: "emma_eco", points: 1100, level: 4, isMe: false },
  { rank: 7, username: "liam_care", points: 980, level: 4, isMe: false },
  { rank: 8, username: "mia_river", points: 870, level: 3, isMe: false },
  { rank: 9, username: "noah_h2o", points: 760, level: 3, isMe: false },
  { rank: 10, username: "chloe_clean", points: 650, level: 3, isMe: false },
];

export const DEMO_VOUCHERS = [
  { id: "v1", title: "Free Coffee", partner: "The Grounds Alexandria", points_cost: 300, category: "food", description: "Redeem for one free flat white at The Grounds of Alexandria. Valid weekdays.", stock: 15 },
  { id: "v2", title: "10% off Groceries", partner: "Woolworths", points_cost: 500, category: "shopping", description: "10% discount on any grocery purchase over $30 at participating Woolworths.", stock: 8 },
  { id: "v3", title: "Free Water Test Kit", partner: "WASH360 Lab", points_cost: 200, category: "health", description: "Claim a free household water testing kit — valid 30 days from redemption.", stock: 50 },
  { id: "v4", title: "$5 Opal Top-Up", partner: "Transport NSW", points_cost: 800, category: "transport", description: "$5 credit added to a registered Opal card for eco-friendly public transport.", stock: 5 },
];

export const DEMO_REPORT_TYPES = [
  { id: "illegal_dumping", label: "Illegal Dumping", emoji: "🗑️" },
  { id: "clogged_drain", label: "Clogged Drain", emoji: "🚰" },
  { id: "broken_tap", label: "Broken Tap", emoji: "💧" },
  { id: "open_defecation", label: "Open Defecation", emoji: "⚠️" },
  { id: "flood_risk", label: "Flood Risk", emoji: "🌊" },
  { id: "other", label: "Other Issue", emoji: "📝" },
];
